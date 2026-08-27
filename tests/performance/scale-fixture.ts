import {
  DataClassification,
  UiControlStatus,
  UiNodeKind,
  UiUpdateTrigger,
  type UiControlState,
  type UiNodeSnapshot,
  type UiTransactionMetadata
} from "@unislang/unifold-events";
import {
  NormalizedNodeStore,
  createSelector,
  type NodeRecipe,
  type UiNodeTransactionDraft
} from "@unislang/unifold-reactivity";

export const ONE_THOUSAND_NODES = 1_000;
export const TEN_THOUSAND_NODES = 10_000;
export const ONE_HUNDRED_CONTROL_FORM_NODES = 111;
const GROUP_CAPACITY = 100;

interface ScaleHarness {
  readonly candidateCounts: number[];
  readonly nodes: readonly UiNodeSnapshot[];
  readonly notifications: Map<string, number>;
  readonly reads: Map<string, number>;
  readonly selectedIds: readonly string[];
  readonly store: NormalizedNodeStore;
  readonly targetId: string;
}

interface AggregateScaleHarness extends ScaleHarness {
  readonly validationCalls: string[];
}

export function createScaleHarness(nodeCount: number, withSelections = true): ScaleHarness {
  const nodes = createScaleNodes(nodeCount);
  const store = new NormalizedNodeStore(nodes, { transactionRetention: 1 });
  const selectedIds = withSelections ? selectionIds(nodes) : [];
  return createHarness(nodes, store, selectedIds, requireTargetControl(nodes, selectedIds));
}

export function createAggregateScaleHarness(
  nodeCount: number,
  groupCount = Math.min(100, Math.floor((nodeCount - 1) / 2))
): AggregateScaleHarness {
  const nodes = createAggregateScaleNodes(nodeCount, groupCount);
  const validationCalls: string[] = [];
  const store = new NormalizedNodeStore(nodes, {
    aggregateValidator: (node) => validateAggregate(node, validationCalls),
    transactionRetention: 1
  });
  validationCalls.length = 0;
  const targetId = fieldId(0);
  const selectedIds = [targetId, groupId(0), "aggregate-root"];
  return { ...createHarness(nodes, store, selectedIds, targetId), validationCalls };
}

function createHarness(
  nodes: readonly UiNodeSnapshot[],
  store: NormalizedNodeStore,
  selectedIds: readonly string[],
  targetId: string
): ScaleHarness {
  const reads = new Map<string, number>();
  const notifications = new Map<string, number>();
  selectedIds.forEach((id) => attachSelection(store, id, reads, notifications));
  return {
    candidateCounts: [],
    nodes,
    notifications,
    reads,
    selectedIds,
    store,
    targetId
  };
}

function createScaleNodes(nodeCount: number): readonly UiNodeSnapshot[] {
  if (nodeCount < 3) throw new Error("Scale fixtures require at least three nodes.");
  const groupCount = Math.ceil((nodeCount - 1) / (GROUP_CAPACITY + 1));
  const groups = Array.from({ length: groupCount }, (_, index) =>
    componentNode(groupId(index), "root")
  );
  const leafCount = nodeCount - groupCount - 1;
  const leaves = Array.from({ length: leafCount }, (_, index) =>
    controlNode(fieldId(index), groupId(index % groupCount))
  );
  return [componentNode("root"), ...groups, ...leaves];
}

export function createAggregateScaleNodes(
  nodeCount: number,
  groupCount: number
): readonly UiNodeSnapshot[] {
  assertAggregateNodeCount(nodeCount);
  assertAggregateGroupCount(nodeCount, groupCount);
  const groups = Array.from({ length: groupCount }, (_, index) => aggregateGroup(index));
  const leaves = Array.from({ length: nodeCount - groupCount - 1 }, (_, index) =>
    aggregateControl(index, groupCount)
  );
  return [aggregateRoot(), ...groups, ...leaves];
}

function assertAggregateNodeCount(nodeCount: number): void {
  if (nodeCount < 4) throw new Error("Aggregate scale fixtures require at least four nodes.");
}

function assertAggregateGroupCount(nodeCount: number, groupCount: number): void {
  if (groupCount < 1) throw new Error("Aggregate scale fixtures require a group.");
  if (groupCount >= nodeCount - 1)
    throw new Error("Aggregate groups must leave room for controls.");
}

export function updateOne(harness: ScaleHarness, sequence: number): void {
  harness.store.transact(metadata(`edit-${sequence}`), (draft) =>
    setControlValue(draft, harness.targetId, `value-${sequence}`)
  );
  recordCandidates(harness);
}

export function updateBulk(harness: ScaleHarness, sequence: number): readonly string[] {
  const ids = bulkControlIds(harness.nodes);
  harness.store.transact(metadata(`bulk-${sequence}`), (draft) => {
    ids.forEach((id) => setControlValue(draft, id, `bulk-${sequence}`));
  });
  recordCandidates(harness);
  return ids;
}

export function updateAggregateOne(harness: AggregateScaleHarness, sequence: number) {
  return harness.store.transact(metadata(`aggregate-${sequence}`), (draft) =>
    setControlValue(draft, harness.targetId, `aggregate-${sequence}`)
  );
}

export function setAggregateDisabled(harness: AggregateScaleHarness, disabled: boolean) {
  return harness.store.transact(metadata(`aggregate-disabled-${String(disabled)}`), (draft) =>
    draft.update("aggregate-root", (node) => {
      node.base.ownDisabled = disabled;
    })
  );
}

export function replay(harness: ScaleHarness, count: number, sequence: number): void {
  for (let index = 0; index < count; index += 1) updateOne(harness, sequence + index);
}

export function reorderFirstGroup(harness: ScaleHarness, sequence: number): string {
  const group = groupId(0);
  const reordered = reorderChildren(harness.nodes, group, sequence % 2 === 0);
  harness.store.transact(metadata(`reorder-${sequence}`), (draft) => draft.reconcile(reordered));
  recordCandidates(harness);
  return group;
}

function recordCandidates(harness: ScaleHarness): void {
  harness.candidateCounts.push(harness.store.getSelectionDispatchMetrics().candidateSelections);
}

export function selectedCount(ids: readonly string[], candidates: readonly string[]): number {
  const selected = new Set(ids);
  return candidates.filter((id) => selected.has(id)).length;
}

function attachSelection(
  store: NormalizedNodeStore,
  id: string,
  reads: Map<string, number>,
  notifications: Map<string, number>
): void {
  const selection = store.select(
    createSelector(
      (state) => {
        reads.set(id, (reads.get(id) ?? 0) + 1);
        return state.nodes[id];
      },
      [id]
    )
  );
  selection.subscribe(() => notifications.set(id, (notifications.get(id) ?? 0) + 1));
}

function selectionIds(nodes: readonly UiNodeSnapshot[]): readonly string[] {
  return nodes.filter((_node, index) => index % 5 === 0).map(({ id }) => id);
}

function requireTargetControl(
  nodes: readonly UiNodeSnapshot[],
  selectedIds: readonly string[]
): string {
  if (selectedIds.length === 0) return requireControlNode(nodes);
  const selected = new Set(selectedIds);
  const target = nodes.find((node) => node.control !== undefined && selected.has(node.id));
  if (target === undefined) throw new Error("A selected control is required.");
  return target.id;
}

function requireControlNode(nodes: readonly UiNodeSnapshot[]): string {
  const target = nodes.find((node) => node.control !== undefined);
  if (target === undefined) throw new Error("A control is required.");
  return target.id;
}

function bulkControlIds(nodes: readonly UiNodeSnapshot[]): readonly string[] {
  const count = Math.max(1, Math.floor(nodes.length / 100));
  return nodes
    .filter((node) => node.control !== undefined)
    .slice(0, count)
    .map(({ id }) => id);
}

function reorderChildren(
  nodes: readonly UiNodeSnapshot[],
  parentId: string,
  reverse: boolean
): readonly UiNodeSnapshot[] {
  const children = nodes.filter((node) => node.parentId === parentId);
  const ordered = reverse ? [...children].reverse() : children;
  let index = 0;
  return nodes.map((node) => {
    if (node.parentId !== parentId) return node;
    const replacement = ordered[index];
    index += 1;
    if (replacement === undefined) throw new Error(`Missing reordered child for ${parentId}.`);
    return replacement;
  });
}

function setControlValue(draft: UiNodeTransactionDraft, id: string, value: string): void {
  draft.update(id, assignControlValue(id, value));
}

function assignControlValue(id: string, value: string): NodeRecipe {
  return (node) => {
    if (node.control === undefined) throw new Error(`Control is missing: ${id}.`);
    Object.assign(node.control, { rawValue: value, value });
  };
}

function componentNode(id: string, parentId?: string): UiNodeSnapshot {
  return node(id, UiNodeKind.Component, parentId);
}

function controlNode(id: string, parentId: string): UiNodeSnapshot {
  return { ...node(id, UiNodeKind.Control, parentId), control: controlState() };
}

function aggregateRoot(): UiNodeSnapshot {
  return aggregateNode("aggregate-root", UiNodeKind.Form, undefined, ["aggregate-root"]);
}

function aggregateGroup(index: number): UiNodeSnapshot {
  const id = groupId(index);
  return aggregateNode(id, UiNodeKind.Group, "aggregate-root", ["aggregate-root", id]);
}

function aggregateControl(index: number, groupCount: number): UiNodeSnapshot {
  const id = fieldId(index);
  const parentId = groupId(index % groupCount);
  return aggregateNode(id, UiNodeKind.Control, parentId, ["aggregate-root", parentId, id]);
}

function aggregateNode(
  id: string,
  kind: UiNodeKind,
  parentId: string | undefined,
  scopePath: readonly string[]
): UiNodeSnapshot {
  const base = node(id, kind, parentId);
  return { ...base, control: controlState(), properties: { name: id }, scopePath };
}

function validateAggregate(node: UiNodeSnapshot, calls: string[]): UiControlState {
  calls.push(node.id);
  if (node.control === undefined) throw new Error(`Aggregate control is missing: ${node.id}.`);
  return node.control;
}

function node(id: string, kind: UiNodeKind, parentId?: string): UiNodeSnapshot {
  const scopePath = parentId === undefined ? [id] : ["root", parentId, id];
  const base = {
    attributes: {},
    base: {
      busy: false,
      dataClassification: DataClassification.Public,
      disabled: false,
      focused: false,
      interactive: true,
      mounted: true,
      readonly: false,
      visible: true
    },
    definitionVersion: "1.0.0",
    id,
    instanceId: id,
    kind,
    properties: {},
    revision: 0,
    scopePath,
    type: nodeType(kind)
  };
  if (parentId === undefined) return base;
  return { ...base, parentId };
}

function nodeType(kind: UiNodeKind): string {
  return kind === UiNodeKind.Control ? "TextField" : "Box";
}

function controlState(): UiControlState<string> {
  return {
    asyncValidatorIds: [],
    dirty: false,
    errors: [],
    initialValue: "",
    pending: false,
    pristine: true,
    rawValue: "",
    required: false,
    status: UiControlStatus.Valid,
    touched: false,
    updateOn: UiUpdateTrigger.Input,
    validationRequestId: null,
    validatorIds: [],
    value: ""
  };
}

function metadata(id: string): UiTransactionMetadata {
  return { correlationId: id, id, timestamp: "2026-08-25T00:00:00.000Z" };
}

function groupId(index: number): string {
  return `group-${String(index).padStart(3, "0")}`;
}

function fieldId(index: number): string {
  return `field-${String(index).padStart(5, "0")}`;
}
