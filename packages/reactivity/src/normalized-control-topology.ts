import type { UiNodeId, UiNodeSnapshot } from "@unislang/unifold-events";

export function buildControlChildren(
  nodes: readonly UiNodeSnapshot[]
): Record<UiNodeId, UiNodeId[]> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = Object.fromEntries(nodes.map(({ id }) => [id, [] as UiNodeId[]]));
  nodes.forEach((node) => assignExplicitChildren(children, node));
  nodes.forEach((node) => appendLegacyChild(children, node, byId));
  validateControlChildren(children, byId);
  validateControlParents(nodes, children, byId);
  validateControlCycles(nodes, byId);
  return children;
}

export function logicalControlParentId(node: UiNodeSnapshot): UiNodeId | undefined {
  return hasExplicitTopology(node) ? node.controlParentId : node.parentId;
}

function hasExplicitTopology(node: UiNodeSnapshot): boolean {
  return [node.controlChildIds, node.controlKey, node.controlParentId].some(
    (value) => value !== undefined
  );
}

function assignExplicitChildren(
  children: Record<UiNodeId, UiNodeId[]>,
  node: UiNodeSnapshot
): void {
  if (node.controlChildIds !== undefined) children[node.id] = [...node.controlChildIds];
}

function appendLegacyChild(
  children: Record<UiNodeId, UiNodeId[]>,
  node: UiNodeSnapshot,
  byId: ReadonlyMap<UiNodeId, UiNodeSnapshot>
): void {
  const parentId = legacyParentId(node);
  if (parentId === undefined) return;
  appendToInferredParent(children, node.id, parentId, byId);
}

function legacyParentId(node: UiNodeSnapshot): UiNodeId | undefined {
  return hasExplicitTopology(node) ? undefined : node.parentId;
}

function appendToInferredParent(
  children: Record<UiNodeId, UiNodeId[]>,
  childId: UiNodeId,
  parentId: UiNodeId,
  byId: ReadonlyMap<UiNodeId, UiNodeSnapshot>
): void {
  if (hasExplicitChildren(byId.get(parentId))) return;
  children[parentId]?.push(childId);
}

function hasExplicitChildren(node: UiNodeSnapshot | undefined): boolean {
  return node !== undefined && node.controlChildIds !== undefined;
}

function validateControlChildren(
  children: Readonly<Record<UiNodeId, readonly UiNodeId[]>>,
  byId: ReadonlyMap<UiNodeId, UiNodeSnapshot>
): void {
  Object.entries(children).forEach(([parentId, childIds]) => {
    if (new Set(childIds).size !== childIds.length)
      throw new Error(`Duplicate control child: ${parentId}`);
    childIds.forEach((childId) => validateControlChild(parentId, childId, byId));
    validateSiblingKeys(parentId, childIds, byId);
  });
}

function validateControlChild(
  parentId: UiNodeId,
  childId: UiNodeId,
  byId: ReadonlyMap<UiNodeId, UiNodeSnapshot>
): void {
  const child = byId.get(childId);
  if (child === undefined) throw new Error(`Unknown control child: ${childId}`);
  if (logicalControlParentId(child) !== parentId) {
    throw new Error(`Control parent mismatch: ${parentId}/${childId}`);
  }
}

function validateSiblingKeys(
  parentId: UiNodeId,
  childIds: readonly UiNodeId[],
  byId: ReadonlyMap<UiNodeId, UiNodeSnapshot>
): void {
  const keys = childIds.flatMap((id) => optionalControlKey(byId.get(id)));
  if (new Set(keys).size !== keys.length) throw new Error(`Duplicate control key: ${parentId}`);
}

function optionalControlKey(node: UiNodeSnapshot | undefined): string[] {
  return node?.controlKey === undefined ? [] : [node.controlKey];
}

function validateControlParents(
  nodes: readonly UiNodeSnapshot[],
  children: Readonly<Record<UiNodeId, readonly UiNodeId[]>>,
  byId: ReadonlyMap<UiNodeId, UiNodeSnapshot>
): void {
  nodes.forEach((node) => validateControlParent(node, children, byId));
}

function validateControlParent(
  node: UiNodeSnapshot,
  children: Readonly<Record<UiNodeId, readonly UiNodeId[]>>,
  byId: ReadonlyMap<UiNodeId, UiNodeSnapshot>
): void {
  const parentId = traversableParentId(node, byId);
  if (parentId !== undefined) validateIncludedChild(node.id, parentId, children, byId);
}

function validateIncludedChild(
  childId: UiNodeId,
  parentId: UiNodeId,
  children: Readonly<Record<UiNodeId, readonly UiNodeId[]>>,
  byId: ReadonlyMap<UiNodeId, UiNodeSnapshot>
): void {
  assertKnownControlParent(parentId, byId);
  assertIncludedControlChild(childId, parentId, children);
}

function assertKnownControlParent(
  parentId: UiNodeId,
  byId: ReadonlyMap<UiNodeId, UiNodeSnapshot>
): void {
  if (!byId.has(parentId)) throw new Error(`Unknown control parent: ${parentId}`);
}

function assertIncludedControlChild(
  childId: UiNodeId,
  parentId: UiNodeId,
  children: Readonly<Record<UiNodeId, readonly UiNodeId[]>>
): void {
  if ((children[parentId] ?? []).includes(childId)) return;
  throw new Error(`Control parent does not include child: ${parentId}/${childId}`);
}

function validateControlCycles(
  nodes: readonly UiNodeSnapshot[],
  byId: ReadonlyMap<UiNodeId, UiNodeSnapshot>
): void {
  nodes.forEach(({ id }) => validateControlPath(id, byId));
}

function validateControlPath(id: UiNodeId, byId: ReadonlyMap<UiNodeId, UiNodeSnapshot>): void {
  const visited = new Set<UiNodeId>();
  let current = byId.get(id);
  while (current !== undefined) {
    if (visited.has(current.id)) throw new Error(`Control parent cycle: ${id}`);
    visited.add(current.id);
    current = parentNode(current, byId);
  }
}

function parentNode(
  node: UiNodeSnapshot,
  byId: ReadonlyMap<UiNodeId, UiNodeSnapshot>
): UiNodeSnapshot | undefined {
  const parentId = traversableParentId(node, byId);
  return parentId === undefined ? undefined : byId.get(parentId);
}

function traversableParentId(
  node: UiNodeSnapshot,
  byId: ReadonlyMap<UiNodeId, UiNodeSnapshot>
): UiNodeId | undefined {
  const parentId = logicalControlParentId(node);
  if (parentId === undefined) return undefined;
  return ignoredLegacyParent(node, byId.get(parentId)) ? undefined : parentId;
}

function ignoredLegacyParent(node: UiNodeSnapshot, parent: UiNodeSnapshot | undefined): boolean {
  return !hasExplicitTopology(node) && hasExplicitChildren(parent);
}
