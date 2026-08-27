import type { UiNodeId, UiNodeSnapshot } from "@unislang/unifold-events";

export function validateVisualTopology(nodes: readonly UiNodeSnapshot[]): void {
  const ids = uniqueIds(nodes);
  nodes.forEach((node) => validateParent(node, ids));
  validateCycles(nodes);
}

export function buildVisualChildren(
  nodes: readonly UiNodeSnapshot[]
): Record<UiNodeId, UiNodeId[]> {
  const children = Object.fromEntries(nodes.map(({ id }) => [id, [] as UiNodeId[]]));
  nodes.forEach((node) => appendChild(children, node));
  return children;
}

function uniqueIds(nodes: readonly UiNodeSnapshot[]): ReadonlySet<UiNodeId> {
  const ids = new Set<UiNodeId>();
  nodes.forEach(({ id }) => {
    if (ids.has(id)) throw new Error(`Duplicate reconciled node: ${id}`);
    ids.add(id);
  });
  return ids;
}

function validateParent(node: UiNodeSnapshot, ids: ReadonlySet<UiNodeId>): void {
  if (node.parentId === undefined) return;
  validateDistinctParent(node);
  validateKnownParent(node.parentId, ids);
}

function validateDistinctParent(node: UiNodeSnapshot): void {
  if (node.parentId === node.id) throw new Error(`Node cannot parent itself: ${node.id}`);
}

function validateKnownParent(parentId: UiNodeId, ids: ReadonlySet<UiNodeId>): void {
  if (!ids.has(parentId)) throw new Error(`Unknown reconciled parent: ${parentId}`);
}

function validateCycles(nodes: readonly UiNodeSnapshot[]): void {
  const parents = Object.fromEntries(nodes.map(({ id, parentId }) => [id, parentId]));
  nodes.forEach(({ id }) => assertAcyclic(id, parents));
}

function assertAcyclic(
  id: UiNodeId,
  parents: Readonly<Record<UiNodeId, UiNodeId | undefined>>
): void {
  const visited = new Set<UiNodeId>();
  let current: UiNodeId | undefined = id;
  while (current !== undefined) {
    if (visited.has(current)) throw new Error(`Reconciled parent cycle: ${id}`);
    visited.add(current);
    current = parents[current];
  }
}

function appendChild(children: Record<UiNodeId, UiNodeId[]>, node: UiNodeSnapshot): void {
  if (node.parentId !== undefined) children[node.parentId]?.push(node.id);
}
