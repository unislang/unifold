import type { UiNodeId, UiNodeSnapshot } from "@unislang/unifold-events";
import { castDraft, type Draft } from "immer";
import type { NodeRecipe, NormalizedNodeState, UiNodeTransactionDraft } from "./store-types.js";
import { migrateSnapshot } from "./snapshot-migration.js";
import { buildControlChildren, logicalControlParentId } from "./normalized-control-topology.js";
import { buildVisualChildren, validateVisualTopology } from "./normalized-visual-topology.js";
import {
  assertUniqueControlKey,
  attachToControlParent,
  controlChildId,
  detachFromControlParent,
  moveControlChild,
  requireControlChildren
} from "./control-collection.js";

export class NodeTransactionDraft implements UiNodeTransactionDraft {
  constructor(private readonly state: Draft<NormalizedNodeState>) {}

  add(node: UiNodeSnapshot): void {
    assertAvailable(this.state, node.id);
    assertParent(this.state, node);
    assertControlParent(this.state, node);
    this.state.nodes[node.id] = castDraft(node);
    this.state.children[node.id] = [];
    this.state.controlChildren[node.id] = [];
    attachToParent(this.state, node);
    attachToControlParent(this.state, node);
  }

  controlDescendantIds(id: UiNodeId): readonly UiNodeId[] {
    requireNode(this.state, id);
    return collectDescendantIds(this.state.controlChildren, id);
  }

  descendantIds(id: UiNodeId): readonly UiNodeId[] {
    requireNode(this.state, id);
    return collectDescendantIds(this.state.children, id);
  }

  moveControl(parentId: UiNodeId, key: string, index: number): void {
    moveControlChild(this.state, parentId, key, index);
  }

  removeControl(parentId: UiNodeId, key: string): void {
    this.remove(controlChildId(this.state, parentId, key));
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
    reconcileControlChildren(this.state, nodes);
  }

  remove(id: UiNodeId): void {
    const node = requireNode(this.state, id);
    const children = requireChildren(this.state, id);
    if (children.length > 0) throw new Error(`Node has children: ${id}`);
    const controlChildren = requireControlChildren(this.state, id);
    if (controlChildren.length > 0) throw new Error(`Control has children: ${id}`);
    detachFromParent(this.state, node, id);
    detachFromControlParent(this.state, node as unknown as UiNodeSnapshot, id);
    Reflect.deleteProperty(this.state.children, id);
    Reflect.deleteProperty(this.state.controlChildren, id);
    Reflect.deleteProperty(this.state.nodes, id);
  }

  update(id: UiNodeId, recipe: NodeRecipe): void {
    const node = requireNode(this.state, id);
    const parentId = node.parentId;
    const controlParentId = node.controlParentId;
    const controlKey = node.controlKey;
    recipe(node);
    assertImmutableId(node.id, id);
    assertImmutableParent(node.parentId, parentId);
    assertImmutableControlTopology(node, controlParentId, controlKey);
  }
}

function assertImmutableId(current: UiNodeId, expected: UiNodeId): void {
  if (current !== expected) throw new Error("A node ID is immutable.");
}

function assertImmutableParent(
  current: UiNodeId | undefined,
  expected: UiNodeId | undefined
): void {
  if (current !== expected) throw new Error("Use structural commands to reparent nodes.");
}

function assertImmutableControlTopology(
  node: Draft<UiNodeSnapshot>,
  parentId: UiNodeId | undefined,
  key: string | undefined
): void {
  const unchanged = [node.controlParentId === parentId, node.controlKey === key].every(Boolean);
  if (!unchanged) throw new Error("Use structure reconciliation to change control topology.");
}

function collectDescendantIds(
  index: Draft<Readonly<Record<UiNodeId, readonly UiNodeId[]>>>,
  id: UiNodeId
): UiNodeId[] {
  const descendants: UiNodeId[] = [];
  const pending = [...requireIndexedChildren(index, id)];
  while (pending.length > 0) {
    const childId = pending.shift();
    if (childId === undefined) continue;
    descendants.push(childId);
    pending.push(...requireIndexedChildren(index, childId));
  }
  return descendants;
}

function validateDesiredNodes(nodes: readonly UiNodeSnapshot[]): void {
  validateVisualTopology(nodes);
  buildControlChildren(nodes);
}

function removeMissingNodes(
  state: Draft<NormalizedNodeState>,
  desiredIds: ReadonlySet<string>
): void {
  Object.keys(state.nodes).forEach((id) => {
    if (desiredIds.has(id)) return;
    Reflect.deleteProperty(state.nodes, id);
    Reflect.deleteProperty(state.children, id);
    Reflect.deleteProperty(state.controlChildren, id);
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

function reconcileChildren(
  state: Draft<NormalizedNodeState>,
  nodes: readonly UiNodeSnapshot[]
): void {
  const desired = buildVisualChildren(nodes);
  nodes.forEach(({ id }) => {
    const children = desired[id] ?? [];
    if (!sameValue(state.children[id], children)) state.children[id] = children;
  });
}

function reconcileControlChildren(
  state: Draft<NormalizedNodeState>,
  nodes: readonly UiNodeSnapshot[]
): void {
  const desired = buildControlChildren(nodes);
  nodes.forEach(({ id }) => {
    const children = desired[id] ?? [];
    if (!sameValue(state.controlChildren[id], children)) state.controlChildren[id] = children;
  });
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

function assertControlParent(state: Draft<NormalizedNodeState>, node: UiNodeSnapshot): void {
  const parentId = logicalControlParentId(node);
  if (parentId === undefined) return;
  assertKnownControlParent(state, parentId);
  assertAvailableControlKey(state, parentId, node.controlKey);
}

function assertKnownControlParent(state: Draft<NormalizedNodeState>, parentId: UiNodeId): void {
  if (!state.nodes[parentId]) throw new Error(`Unknown control parent: ${parentId}`);
}

function assertAvailableControlKey(
  state: Draft<NormalizedNodeState>,
  parentId: UiNodeId,
  key: string | undefined
): void {
  if (key !== undefined) assertUniqueControlKey(state, parentId, key);
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

function requireIndexedChildren(
  index: Draft<Readonly<Record<UiNodeId, readonly UiNodeId[]>>>,
  id: UiNodeId
): Draft<UiNodeId[]> {
  const children = index[id];
  if (!children) throw new Error(`Unknown node: ${id}`);
  return children as Draft<UiNodeId[]>;
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
