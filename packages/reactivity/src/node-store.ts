import {
  UiTransactionStatus,
  type UiNodeId,
  type UiNodeSnapshot,
  type UiValidationError,
  type UiTransactionMetadata,
  type UiTransactionRecord
} from "@unislang/unifold-events";
import { enablePatches, produce, produceWithPatches, type Patch } from "immer";
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
import { reconcileValidationRoutes } from "./validation-routes.js";
import { reconcileEffectiveDisabled } from "./effective-disabled.js";
import { createInitialNodeState } from "./initial-node-state.js";
import {
  createNodeStoreCoordination,
  type NormalizedNodeStoreCoordination
} from "./node-store-coordination.js";

enablePatches();

export interface NormalizedNodeStoreOptions {
  readonly aggregateValidator?: AggregateControlValidator;
  readonly controlValidator?: AggregateControlValidator;
  readonly initializer?: (draft: UiNodeTransactionDraft) => void;
  readonly transactionRetention?: number;
}

interface ActiveCoordination {
  readonly changedNodeIds: Set<UiNodeId>;
  readonly previousMetrics: SelectionDispatchMetrics;
  readonly previousState: NormalizedNodeState;
  readonly records: UiTransactionRecord[];
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
  private coordination: ActiveCoordination | undefined;

  constructor(nodes: readonly UiNodeSnapshot[], options: NormalizedNodeStoreOptions = {}) {
    this.aggregateValidator = options.aggregateValidator;
    this.controlValidator = options.controlValidator;
    this.state = createInitialNodeState(
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

  beginCoordination(): NormalizedNodeStoreCoordination {
    if (this.coordination !== undefined) {
      throw new Error("Node store coordination is already active.");
    }
    this.coordination = {
      changedNodeIds: new Set(),
      previousMetrics: this.selectionMetrics,
      previousState: this.state,
      records: []
    };
    return createNodeStoreCoordination(
      () => this.commitCoordination(),
      () => this.discardCoordination()
    );
  }

  select<T>(selector: UiSelector<T>, equal = Object.is): UiSelection<T> {
    if (this.coordination !== undefined) {
      throw new Error("Cannot create a selection during node store coordination.");
    }
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
    if (this.coordination !== undefined) {
      throw new Error("Cannot dispose the node store during coordination.");
    }
    this.selections.values().forEach((selection) => selection.dispose());
    this.records.clear();
    this.recordOrder.length = 0;
  }

  private commit(state: NormalizedNodeState, record: UiTransactionRecord): void {
    const previous = this.state;
    this.state = state;
    if (this.coordination !== undefined) {
      this.coordination.records.push(record);
      record.changedNodeIds.forEach((id) => this.coordination?.changedNodeIds.add(id));
      return;
    }
    this.retain(record);
    this.refreshSelections(previous, new Set(record.changedNodeIds));
  }

  private commitCoordination(): void {
    const coordination = this.requireCoordination();
    this.coordination = undefined;
    if (coordination.records.length === 0) return;
    coordination.records.forEach((record) => this.retain(record));
    this.refreshSelections(coordination.previousState, coordination.changedNodeIds);
  }

  private discardCoordination(): void {
    const coordination = this.requireCoordination();
    this.state = coordination.previousState;
    this.selectionMetrics = coordination.previousMetrics;
    this.coordination = undefined;
  }

  private requireCoordination(): ActiveCoordination {
    const coordination = this.coordination;
    if (coordination === undefined) throw new Error("Node store coordination is not active.");
    return coordination;
  }

  private refreshSelections(previous: NormalizedNodeState, changedIds: Set<UiNodeId>): void {
    const invalidatedIds = invalidatedNodeIds(previous, this.state, [...changedIds]);
    const invalidatedSelections = this.disposeInvalidated(invalidatedIds);
    const candidates = this.selections.candidates(changedIds);
    candidates.forEach((selection) => selection.refresh(this.state, changedIds));
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
