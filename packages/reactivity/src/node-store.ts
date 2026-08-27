import {
  UiTransactionStatus,
  type UiNodeId,
  type UiNodeSnapshot,
  type UiValidationError,
  type UiTransactionMetadata,
  type UiTransactionRecord
} from "@unislang/unifold-events";
import { enablePatches, freeze, produce, produceWithPatches, type Patch } from "immer";
import { StoreSelection } from "./selection.js";
import { SelectionIndex } from "./selection-index.js";
import type {
  AggregateControlValidator,
  NormalizedNodeState,
  SelectionDispatchMetrics,
  UiNodeStore,
  UiNodeTransactionDraft,
  UiSelection,
  UiSelector
} from "./store-types.js";
import { NodeTransactionDraft } from "./transaction-draft.js";
import { recomputeAggregateControls } from "./aggregate-controls.js";
import { buildControlChildren } from "./normalized-control-topology.js";
import { reconcileValidationRoutes } from "./validation-routes.js";
import { reconcileEffectiveDisabled } from "./effective-disabled.js";

enablePatches();

export interface NormalizedNodeStoreOptions {
  readonly aggregateValidator?: AggregateControlValidator;
  readonly controlValidator?: AggregateControlValidator;
  readonly initializer?: (draft: UiNodeTransactionDraft) => void;
  readonly transactionRetention?: number;
}

export class NormalizedNodeStore implements UiNodeStore {
  private state: NormalizedNodeState;
  private readonly records = new Map<number, UiTransactionRecord>();
  private readonly recordOrder: number[] = [];
  private readonly selections = new SelectionIndex<StoreSelection<unknown>>();
  private selectionMetrics: SelectionDispatchMetrics = emptySelectionMetrics();
  private readonly retention: number;
  private readonly aggregateValidator: AggregateControlValidator | undefined;
  private readonly controlValidator: AggregateControlValidator | undefined;

  constructor(nodes: readonly UiNodeSnapshot[], options: NormalizedNodeStoreOptions = {}) {
    this.aggregateValidator = options.aggregateValidator;
    this.controlValidator = options.controlValidator;
    this.state = createInitialState(
      nodes,
      this.aggregateValidator,
      this.controlValidator,
      options.initializer
    );
    this.retention = options.transactionRetention ?? 100;
  }

  get revision(): number {
    return this.state.revision;
  }

  getSnapshot(id: UiNodeId): UiNodeSnapshot {
    const snapshot = this.state.nodes[id];
    if (!snapshot) throw new Error(`Unknown node: ${id}`);
    return snapshot;
  }

  getNodeIds(): readonly UiNodeId[] {
    return Object.keys(this.state.nodes);
  }

  getSnapshots(): readonly UiNodeSnapshot[] {
    return Object.values(this.state.nodes);
  }

  getSelectionDispatchMetrics(): SelectionDispatchMetrics {
    return this.selectionMetrics;
  }

  getTransaction(revision: number): UiTransactionRecord | undefined {
    return this.records.get(revision);
  }

  getValidationErrors(id: UiNodeId): readonly UiValidationError[] {
    this.getSnapshot(id);
    return this.state.validationRoutes[id] ?? [];
  }

  select<T>(selector: UiSelector<T>, equal = Object.is): UiSelection<T> {
    const selection = new StoreSelection(selector, this.state, equal, () =>
      this.selections.delete(selection as StoreSelection<unknown>)
    );
    this.selections.add(selection as StoreSelection<unknown>);
    return selection;
  }

  transact(
    metadata: UiTransactionMetadata,
    change: (draft: UiNodeTransactionDraft) => void
  ): UiTransactionRecord {
    const previous = this.state;
    const [changed, directPatches] = produceWithPatches(previous, (draft) => {
      change(new NodeTransactionDraft(draft));
    });
    const directIds = new Set(changedNodeIds(directPatches));
    const [candidate, derivedPatches] = deriveState(
      changed,
      directIds,
      this.aggregateValidator,
      this.controlValidator
    );
    const patches = [...directPatches, ...derivedPatches];
    if (patches.length === 0)
      return createRecord(metadata, previous.revision, previous.revision, patches);
    const ids = changedNodeIds(patches);
    const next = finalizeRevision(candidate, previous.revision + 1, ids);
    const record = createRecord(metadata, previous.revision, next.revision, patches);
    this.commit(next, record);
    return record;
  }

  dispose(): void {
    this.selections.values().forEach((selection) => selection.dispose());
    this.records.clear();
    this.recordOrder.length = 0;
  }

  private commit(state: NormalizedNodeState, record: UiTransactionRecord): void {
    const invalidatedIds = invalidatedNodeIds(this.state, state, record.changedNodeIds);
    this.state = state;
    this.retain(record);
    const changedIds = new Set(record.changedNodeIds);
    const invalidatedSelections = this.disposeInvalidated(invalidatedIds);
    const candidates = this.selections.candidates(changedIds);
    candidates.forEach((selection) => selection.refresh(state, changedIds));
    this.selectionMetrics = {
      activeSelections: this.selections.size,
      candidateSelections: candidates.size,
      changedNodeCount: changedIds.size,
      invalidatedSelections
    };
  }

  private disposeInvalidated(invalidatedIds: ReadonlySet<UiNodeId>): number {
    let disposed = 0;
    this.selections.candidates(invalidatedIds).forEach((selection) => {
      if (selection.disposeWhenInvalidated(invalidatedIds)) disposed += 1;
    });
    return disposed;
  }

  private retain(record: UiTransactionRecord): void {
    this.records.set(record.revision, record);
    this.recordOrder.push(record.revision);
    if (this.recordOrder.length <= this.retention) return;
    const expired = this.recordOrder.shift();
    if (expired !== undefined) {
      this.records.delete(expired);
    }
  }
}

function deriveState(
  state: NormalizedNodeState,
  directIds: ReadonlySet<UiNodeId>,
  validateAggregate?: AggregateControlValidator,
  validateControl?: AggregateControlValidator
): readonly [NormalizedNodeState, readonly Patch[]] {
  const [derived, patches] = produceWithPatches(state, (draft) => {
    const disabledIds = reconcileEffectiveDisabled(draft, directIds, validateControl);
    const affectedIds = new Set([...directIds, ...disabledIds]);
    const aggregateIds = recomputeAggregateControls(draft, validateAggregate, affectedIds);
    reconcileValidationRoutes(draft, new Set([...affectedIds, ...aggregateIds]));
  });
  return [derived, patches];
}

function emptySelectionMetrics(): SelectionDispatchMetrics {
  return {
    activeSelections: 0,
    candidateSelections: 0,
    changedNodeCount: 0,
    invalidatedSelections: 0
  };
}

function createInitialState(
  nodes: readonly UiNodeSnapshot[],
  validateAggregate?: AggregateControlValidator,
  validateControl?: AggregateControlValidator,
  initializer?: (draft: UiNodeTransactionDraft) => void
): NormalizedNodeState {
  const state = createEmptyState();
  nodes.forEach((node) => addInitialNode(state, node));
  state.controlChildren = buildControlChildren(nodes);
  nodes.forEach((node) => linkVisualParent(state.children, node));
  const aggregated = produce(state, (draft) => {
    const transaction = new NodeTransactionDraft(draft);
    reconcileEffectiveDisabled(draft, Object.keys(draft.nodes), validateControl);
    applyInitializer(initializer, transaction);
    reconcileEffectiveDisabled(draft, Object.keys(draft.nodes), validateControl);
    recomputeAggregateControls(draft, validateAggregate);
    reconcileValidationRoutes(draft);
  });
  return freeze(aggregated, true);
}

function createEmptyState(): {
  revision: number;
  nodes: Record<string, UiNodeSnapshot>;
  children: Record<string, UiNodeId[]>;
  controlChildren: Record<string, UiNodeId[]>;
  validationRoutes: Record<string, readonly UiValidationError[]>;
} {
  return {
    revision: 0,
    nodes: {},
    children: {},
    controlChildren: {},
    validationRoutes: {}
  };
}

function applyInitializer(
  initializer: ((draft: UiNodeTransactionDraft) => void) | undefined,
  draft: UiNodeTransactionDraft
): void {
  if (initializer !== undefined) initializer(draft);
}

function addInitialNode(
  state: {
    nodes: Record<string, UiNodeSnapshot>;
    children: Record<string, UiNodeId[]>;
    controlChildren: Record<string, UiNodeId[]>;
  },
  node: UiNodeSnapshot
): void {
  if (state.nodes[node.id]) throw new Error(`Duplicate node: ${node.id}`);
  state.nodes[node.id] = node;
  state.children[node.id] = [];
  state.controlChildren[node.id] = [...(node.controlChildIds ?? [])];
}

function linkVisualParent(children: Record<string, UiNodeId[]>, node: UiNodeSnapshot): void {
  if (node.parentId !== undefined) requireInitialChildren(children, node.parentId).push(node.id);
}

function requireInitialChildren(
  index: Readonly<Record<string, UiNodeId[]>>,
  id: UiNodeId
): UiNodeId[] {
  const children = index[id];
  if (!children) throw new Error(`Unknown parent: ${id}`);
  return children;
}

function finalizeRevision(
  state: NormalizedNodeState,
  revision: number,
  changedIds: readonly UiNodeId[]
): NormalizedNodeState {
  return produce(state, (draft) => {
    draft.revision = revision;
    changedIds.forEach((id) => {
      const node = draft.nodes[id];
      if (node) node.revision = revision;
    });
  });
}

function createRecord(
  metadata: UiTransactionMetadata,
  previousRevision: number,
  revision: number,
  patches: readonly Patch[]
): UiTransactionRecord {
  return Object.freeze({
    ...metadata,
    previousRevision,
    revision,
    changedNodeIds: Object.freeze(changedNodeIds(patches)),
    changedPaths: Object.freeze(patches.map(toChangedPath)),
    status: UiTransactionStatus.Committed
  });
}

function changedNodeIds(patches: readonly Patch[]): UiNodeId[] {
  const ids = patches.filter(isTrackedPatch).map((patch) => patch.path[1] as string);
  return [...new Set(ids)];
}

const trackedPatchRoots = new Set(["nodes", "children", "controlChildren", "validationRoutes"]);

function isTrackedPatch(patch: Patch): boolean {
  return trackedPatchRoots.has(String(patch.path[0])) && typeof patch.path[1] === "string";
}

function invalidatedNodeIds(
  previous: NormalizedNodeState,
  current: NormalizedNodeState,
  changedIds: readonly UiNodeId[]
): ReadonlySet<UiNodeId> {
  const invalidated = new Set<UiNodeId>();
  changedIds.forEach((id) => {
    const node = previous.nodes[id];
    if (node !== undefined && isInvalidated(node, current)) invalidated.add(node.id);
  });
  return invalidated;
}

function isInvalidated(node: UiNodeSnapshot, current: NormalizedNodeState): boolean {
  const replacement = current.nodes[node.id];
  return replacement === undefined || lifetimeKey(node) !== lifetimeKey(replacement);
}

function lifetimeKey(node: UiNodeSnapshot): string {
  return `${node.kind}:${node.type}:${node.definitionVersion}`;
}

function toChangedPath(patch: Patch): string {
  return `/${patch.path.map(escapePointerToken).join("/")}`;
}

function escapePointerToken(token: string | number): string {
  return String(token).replaceAll("~", "~0").replaceAll("/", "~1");
}
