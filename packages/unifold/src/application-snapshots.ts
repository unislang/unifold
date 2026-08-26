import type { JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import { createNodeSnapshot } from "@unislang/unifold-renderer-dom";

import { applyStoreSnapshot, type PreparedApplicationStores } from "./store-adapters.js";

export function createApplicationSnapshots(
  document: UnifoldIrDocument,
  revision: number,
  stores: PreparedApplicationStores,
  hydratedValues: Readonly<Record<string, JsonValue>> = {}
) {
  return document.renderOrder.map((id) => {
    const node = requireNode(document, id);
    const stored = applyStoreSnapshot(document, node, createNodeSnapshot(node, revision), stores);
    return applyHydratedValue(node, stored, hydratedValues);
  });
}

function applyHydratedValue(
  node: UnifoldIrDocument["nodesById"][string],
  snapshot: ReturnType<typeof createNodeSnapshot>,
  values: Readonly<Record<string, JsonValue>>
) {
  if (node.binding !== undefined) return snapshot;
  const value = values[node.id];
  return value === undefined ? snapshot : withHydratedControl(snapshot, value);
}

function withHydratedControl(snapshot: ReturnType<typeof createNodeSnapshot>, value: JsonValue) {
  if (snapshot.control === undefined) return snapshot;
  return {
    ...snapshot,
    control: { ...snapshot.control, initialValue: value, rawValue: value, value },
    properties: { ...snapshot.properties, value }
  };
}

function requireNode(document: UnifoldIrDocument, id: string) {
  const node = document.nodesById[id];
  if (node === undefined) throw new Error(`IR node is missing: ${id}.`);
  return node;
}
