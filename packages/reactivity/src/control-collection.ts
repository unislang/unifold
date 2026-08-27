import type { UiNodeId, UiNodeSnapshot } from "@unislang/unifold-events";
import type { Draft } from "immer";
import { logicalControlParentId } from "./normalized-control-topology.js";
import type { NormalizedNodeState } from "./store-types.js";

export function moveControlChild(
  state: Draft<NormalizedNodeState>,
  parentId: UiNodeId,
  key: string,
  index: number
): void {
  const children = requireControlChildren(state, parentId);
  const childId = controlChildId(state, parentId, key);
  assertControlIndex(index, children.length);
  const current = children.indexOf(childId);
  if (current === index) return;
  children.splice(current, 1);
  children.splice(index, 0, childId);
}

export function controlChildId(
  state: Draft<NormalizedNodeState>,
  parentId: UiNodeId,
  key: string
): UiNodeId {
  const matches = requireControlChildren(state, parentId).filter(
    (id) => state.nodes[id]?.controlKey === key
  );
  if (matches.length !== 1) {
    throw new Error(`Unknown or ambiguous control key: ${parentId}/${key}`);
  }
  return matches[0] as UiNodeId;
}

export function assertUniqueControlKey(
  state: Draft<NormalizedNodeState>,
  parentId: UiNodeId,
  key: string
): void {
  const duplicate = requireControlChildren(state, parentId).some(
    (id) => state.nodes[id]?.controlKey === key
  );
  if (duplicate) throw new Error(`Duplicate control key: ${parentId}/${key}`);
}

export function attachToControlParent(
  state: Draft<NormalizedNodeState>,
  node: UiNodeSnapshot
): void {
  const parentId = logicalControlParentId(node);
  if (parentId !== undefined) requireControlChildren(state, parentId).push(node.id);
}

export function detachFromControlParent(
  state: Draft<NormalizedNodeState>,
  node: UiNodeSnapshot,
  id: UiNodeId
): void {
  const parentId = logicalControlParentId(node);
  if (parentId === undefined) return;
  const siblings = requireControlChildren(state, parentId);
  removeAt(siblings, siblings.indexOf(id));
}

export function requireControlChildren(
  state: Draft<NormalizedNodeState>,
  parentId: UiNodeId
): Draft<UiNodeId[]> {
  const children = state.controlChildren[parentId];
  if (children === undefined) throw new Error(`Unknown node: ${parentId}`);
  return children as Draft<UiNodeId[]>;
}

function assertControlIndex(index: number, length: number): void {
  const valid = [Number.isInteger(index), index >= 0, index < length].every(Boolean);
  if (!valid) throw new Error(`Invalid control index: ${String(index)}`);
}

function removeAt(values: Draft<UiNodeId[]>, index: number): void {
  if (index >= 0) values.splice(index, 1);
}
