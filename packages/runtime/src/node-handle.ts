import type { UiNodeId, UiNodeSnapshot } from "@unislang/unifold-events";
import {
  createSelector,
  type UiEventFabric,
  type UiNodeStore,
  type UiSelection
} from "@unislang/unifold-reactivity";
import type { UiNodeHandle, UiScopeHandle } from "./types.js";

export function createNodeHandle(
  id: UiNodeId,
  store: UiNodeStore,
  fabric: UiEventFabric
): UiNodeHandle {
  return createHandle(id, store, fabric.nodeEvents(id));
}

export function createScopeHandle(
  id: UiNodeId,
  store: UiNodeStore,
  fabric: UiEventFabric
): UiScopeHandle {
  return createHandle(id, store, fabric.scopeEvents(id));
}

function createHandle(
  id: UiNodeId,
  store: UiNodeStore,
  events$: UiNodeHandle["events$"]
): UiNodeHandle {
  return {
    id,
    events$,
    get snapshot() {
      return store.getSnapshot(id);
    },
    select: <T>(read: (snapshot: UiNodeSnapshot) => T): UiSelection<T> => {
      return store.select(
        createSelector((state) => read(requireSnapshot(state.nodes[id], id)), [id])
      );
    }
  };
}

function requireSnapshot(snapshot: UiNodeSnapshot | undefined, id: UiNodeId): UiNodeSnapshot {
  if (!snapshot) throw new Error(`Unknown node: ${id}`);
  return snapshot;
}
