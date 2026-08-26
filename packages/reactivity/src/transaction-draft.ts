import { maximumDataClassification } from "@unislang/unifold-contracts";
import type { UiNodeId, UiNodeSnapshot } from "@unislang/unifold-events";
import { castDraft, type Draft } from "immer";
import type { NodeRecipe, NormalizedNodeState, UiNodeTransactionDraft } from "./store-types.js";

export class NodeTransactionDraft implements UiNodeTransactionDraft {
  constructor(private readonly state: Draft<NormalizedNodeState>) {}

  add(node: UiNodeSnapshot): void {
    assertAvailable(this.state, node.id);
    assertParent(this.state, node);
    this.state.nodes[node.id] = castDraft(node);
    this.state.children[node.id] = [];
    attachToParent(this.state, node);
  }

  descendantIds(id: UiNodeId): readonly UiNodeId[] {
    requireNode(this.state, id);
    return collectDescendantIds(this.state, id);
  }

  getSnapshot(id: UiNodeId): UiNodeSnapshot {
    return requireNode(this.state, id) as unknown as UiNodeSnapshot;
  }

  reconcile(
    nodes: readonly UiNodeSnapshot[],
    identityAliases: Readonly<Record<UiNodeId, UiNodeId>> = {},
    resetNodeIds: readonly UiNodeId[] = []
  ): void {
    validateDesiredNodes(nodes);
    const desiredIds = new Set(nodes.map(({ id }) => id));
    const resets = validateResetNodes(resetNodeIds, desiredIds, identityAliases);
    validateIdentityAliases(this.state, desiredIds, identityAliases);
    nodes.forEach((node) =>
      reconcileNode(this.state, node, identityAliases[node.id], resets.has(node.id))
    );
    removeMissingNodes(this.state, desiredIds);
    reconcileChildren(this.state, nodes);
  }

  remove(id: UiNodeId): void {
    const node = requireNode(this.state, id);
    const children = requireChildren(this.state, id);
    if (children.length > 0) throw new Error(`Node has children: ${id}`);
    detachFromParent(this.state, node, id);
    Reflect.deleteProperty(this.state.children, id);
    Reflect.deleteProperty(this.state.nodes, id);
  }

  update(id: UiNodeId, recipe: NodeRecipe): void {
    const node = requireNode(this.state, id);
    const parentId = node.parentId;
    recipe(node);
    if (node.id !== id) throw new Error("A node ID is immutable.");
    if (node.parentId !== parentId) throw new Error("Use structural commands to reparent nodes.");
  }
}

function collectDescendantIds(state: Draft<NormalizedNodeState>, id: UiNodeId): UiNodeId[] {
  const descendants: UiNodeId[] = [];
  const pending = [...requireChildren(state, id)];
  while (pending.length > 0) {
    const childId = pending.shift();
    if (childId === undefined) continue;
    descendants.push(childId);
    pending.push(...requireChildren(state, childId));
  }
  return descendants;
}

function validateDesiredNodes(nodes: readonly UiNodeSnapshot[]): void {
  const ids = new Set<string>();
  nodes.forEach((node) => {
    if (ids.has(node.id)) throw new Error(`Duplicate reconciled node: ${node.id}`);
    ids.add(node.id);
  });
  nodes.forEach((node) => validateDesiredParent(node, ids));
  validateNoCycles(nodes);
}

function validateDesiredParent(node: UiNodeSnapshot, ids: ReadonlySet<string>): void {
  if (node.parentId === undefined) return;
  assertDifferentParent(node);
  assertKnownParent(node.parentId, ids);
}

function assertDifferentParent(node: UiNodeSnapshot): void {
  if (node.parentId === node.id) throw new Error(`Node cannot parent itself: ${node.id}`);
}

function assertKnownParent(parentId: string, ids: ReadonlySet<string>): void {
  if (!ids.has(parentId)) throw new Error(`Unknown reconciled parent: ${parentId}`);
}

function validateNoCycles(nodes: readonly UiNodeSnapshot[]): void {
  const parents = Object.fromEntries(nodes.map(({ id, parentId }) => [id, parentId]));
  nodes.forEach(({ id }) => assertAcyclic(id, parents));
}

function assertAcyclic(id: string, parents: Readonly<Record<string, string | undefined>>): void {
  const visited = new Set<string>();
  let current: string | undefined = id;
  while (current !== undefined) {
    if (visited.has(current)) throw new Error(`Reconciled parent cycle: ${id}`);
    visited.add(current);
    current = parents[current];
  }
}

function removeMissingNodes(
  state: Draft<NormalizedNodeState>,
  desiredIds: ReadonlySet<string>
): void {
  Object.keys(state.nodes).forEach((id) => {
    if (desiredIds.has(id)) return;
    Reflect.deleteProperty(state.nodes, id);
    Reflect.deleteProperty(state.children, id);
  });
}

function reconcileNode(
  state: Draft<NormalizedNodeState>,
  desired: UiNodeSnapshot,
  migratedFrom: UiNodeId | undefined,
  reset: boolean
): void {
  const current = currentNode(state, desired.id, migratedFrom, reset);
  if (current === undefined) {
    state.nodes[desired.id] = castDraft(desired);
    return;
  }
  const reconciled = migrateSnapshot(current as unknown as UiNodeSnapshot, desired);
  if (sameValue(current, reconciled)) return;
  state.nodes[desired.id] = castDraft(reconciled);
}

function currentNode(
  state: Draft<NormalizedNodeState>,
  id: UiNodeId,
  migratedFrom: UiNodeId | undefined,
  reset: boolean
): Draft<UiNodeSnapshot> | undefined {
  if (reset) return undefined;
  return state.nodes[reconciliationSourceId(id, migratedFrom)];
}

function validateResetNodes(
  resetNodeIds: readonly UiNodeId[],
  desiredIds: ReadonlySet<UiNodeId>,
  aliases: Readonly<Record<UiNodeId, UiNodeId>>
): ReadonlySet<UiNodeId> {
  const resets = new Set<UiNodeId>();
  resetNodeIds.forEach((id) => {
    assertResetNode(desiredIds.has(id));
    assertResetNode(aliases[id] === undefined);
    assertResetNode(!resets.has(id));
    resets.add(id);
  });
  return resets;
}

function assertResetNode(valid: boolean): void {
  if (!valid) throw new Error("Invalid reset node.");
}

function reconciliationSourceId(id: UiNodeId, migratedFrom: UiNodeId | undefined): UiNodeId {
  return migratedFrom === undefined ? id : migratedFrom;
}

function validateIdentityAliases(
  state: Draft<NormalizedNodeState>,
  desiredIds: ReadonlySet<UiNodeId>,
  aliases: Readonly<Record<UiNodeId, UiNodeId>>
): void {
  const claimed = new Set<UiNodeId>();
  Object.entries(aliases).forEach(([targetId, sourceId]) => {
    assertIdentityMigration(targetId, sourceId, desiredIds, claimed, state);
    claimed.add(sourceId);
  });
}

function assertIdentityMigration(
  targetId: UiNodeId,
  sourceId: UiNodeId,
  desiredIds: ReadonlySet<UiNodeId>,
  claimed: ReadonlySet<UiNodeId>,
  state: Draft<NormalizedNodeState>
): void {
  assertIdentityAlias(desiredIds.has(targetId));
  assertIdentityAlias(!desiredIds.has(sourceId));
  assertIdentityAlias(state.nodes[targetId] === undefined);
  assertIdentityAlias(state.nodes[sourceId] !== undefined);
  assertIdentityAlias(!claimed.has(sourceId));
}

function assertIdentityAlias(valid: boolean): void {
  if (!valid) throw new Error("Invalid alias.");
}

function migrateSnapshot(current: UiNodeSnapshot, desired: UiNodeSnapshot): UiNodeSnapshot {
  if (!sameControlContract(current, desired)) return desired;
  const control = migrateControl(current, desired);
  return {
    ...desired,
    base: migrateBase(current, desired),
    ...(control === undefined ? {} : { control }),
    revision: current.revision
  };
}

function migrateBase(current: UiNodeSnapshot, desired: UiNodeSnapshot): UiNodeSnapshot["base"] {
  const classification = current.control?.dirty
    ? maximumDataClassification([current.base.dataClassification, desired.base.dataClassification])
    : desired.base.dataClassification;
  return {
    ...desired.base,
    busy: current.base.busy,
    dataClassification: classification,
    focused: current.base.focused
  };
}

function migrateControl(
  current: UiNodeSnapshot,
  desired: UiNodeSnapshot
): UiNodeSnapshot["control"] {
  const controls = pairedControls(current, desired);
  if (controls === undefined) return desired.control;
  if (controls.current.pristine) return controls.desired;
  return {
    ...controls.current,
    required: controls.desired.required,
    updateOn: controls.desired.updateOn,
    validatorIds: controls.desired.validatorIds,
    asyncValidatorIds: controls.desired.asyncValidatorIds
  };
}

function pairedControls(current: UiNodeSnapshot, desired: UiNodeSnapshot) {
  if (current.control === undefined) return undefined;
  if (desired.control === undefined) return undefined;
  return { current: current.control, desired: desired.control };
}

function sameControlContract(left: UiNodeSnapshot, right: UiNodeSnapshot): boolean {
  return left.kind === right.kind && left.type === right.type;
}

function reconcileChildren(
  state: Draft<NormalizedNodeState>,
  nodes: readonly UiNodeSnapshot[]
): void {
  const desired = desiredChildren(nodes);
  nodes.forEach(({ id }) => {
    const children = desired[id] ?? [];
    if (!sameValue(state.children[id], children)) state.children[id] = children;
  });
}

function desiredChildren(nodes: readonly UiNodeSnapshot[]): Record<string, string[]> {
  const children = Object.fromEntries(nodes.map(({ id }) => [id, [] as string[]]));
  nodes.forEach((node) => {
    if (node.parentId !== undefined) children[node.parentId]?.push(node.id);
  });
  return children;
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertAvailable(state: Draft<NormalizedNodeState>, id: UiNodeId): void {
  if (state.nodes[id]) throw new Error(`Duplicate node: ${id}`);
}

function assertParent(state: Draft<NormalizedNodeState>, node: UiNodeSnapshot): void {
  if (node.parentId && !state.nodes[node.parentId]) {
    throw new Error(`Unknown parent: ${node.parentId}`);
  }
}

function requireNode(state: Draft<NormalizedNodeState>, id: UiNodeId): Draft<UiNodeSnapshot> {
  const node = state.nodes[id];
  if (!node) throw new Error(`Unknown node: ${id}`);
  return node;
}

function requireChildren(state: Draft<NormalizedNodeState>, id: UiNodeId): Draft<UiNodeId[]> {
  const children = state.children[id];
  if (!children) throw new Error(`Unknown node: ${id}`);
  return children;
}

function attachToParent(state: Draft<NormalizedNodeState>, node: UiNodeSnapshot): void {
  if (!node.parentId) return;
  requireChildren(state, node.parentId).push(node.id);
}

function detachFromParent(
  state: Draft<NormalizedNodeState>,
  node: Draft<UiNodeSnapshot>,
  id: UiNodeId
): void {
  if (!node.parentId) return;
  removeChild(state, node.parentId, id);
}

function removeChild(state: Draft<NormalizedNodeState>, parentId: UiNodeId, id: UiNodeId): void {
  const siblings = requireChildren(state, parentId);
  removeAt(siblings, siblings.indexOf(id));
}

function removeAt(values: Draft<UiNodeId[]>, index: number): void {
  if (index >= 0) values.splice(index, 1);
}
