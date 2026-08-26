import type { UiNodeId, UiNodeSnapshot, UiValidationError } from "@unislang/unifold-events";
import type { NormalizedNodeState, UiSelector } from "./store-types.js";

export function nodeSelector(id: UiNodeId): UiSelector<UiNodeSnapshot> {
  return {
    nodeIds: [id],
    read: (state) => requireSnapshot(state, id)
  };
}

export function createSelector<T>(
  read: (state: NormalizedNodeState) => T,
  nodeIds?: readonly UiNodeId[]
): UiSelector<T> {
  return nodeIds ? { read, nodeIds } : { read };
}

export function validationErrorsSelector(id: UiNodeId): UiSelector<readonly UiValidationError[]> {
  return {
    nodeIds: [id],
    read: (state) => state.validationRoutes[id] ?? []
  };
}

function requireSnapshot(state: NormalizedNodeState, id: UiNodeId): UiNodeSnapshot {
  const snapshot = state.nodes[id];
  if (!snapshot) throw new Error(`Unknown node: ${id}`);
  return snapshot;
}
