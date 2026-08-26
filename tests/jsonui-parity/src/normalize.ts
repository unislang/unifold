import type { JsonUINode } from "@jsonui/react";
import type { PreparedUnifoldDocument } from "@unislang/unifold";

export interface NormalizedParityNode {
  readonly childIds: readonly string[];
  readonly id: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly type: string;
}

export function normalizeAuthored(view: JsonUINode): readonly NormalizedParityNode[] {
  return flatten(view).map(normalizeAuthoredNode);
}

export function normalizeIr(
  document: PreparedUnifoldDocument["document"],
  expected: readonly NormalizedParityNode[]
): readonly NormalizedParityNode[] {
  const expectedById = new Map(expected.map((node) => [node.id, node]));
  return document.renderOrder.map((id) => {
    const node = requireNode(document.nodesById[id], id);
    const propertyNames = Object.keys(requireNode(expectedById.get(id), id).properties);
    return {
      childIds: node.childIds,
      id,
      properties: pickProperties(node.properties, propertyNames),
      type: node.componentType
    };
  });
}

function flatten(root: JsonUINode): readonly JsonUINode[] {
  const children = Array.isArray(root.$children) ? root.$children : [];
  return [root, ...children.flatMap((child) => flatten(child as JsonUINode))];
}

function normalizeAuthoredNode(node: JsonUINode): NormalizedParityNode {
  const children = Array.isArray(node.$children) ? node.$children : [];
  return {
    childIds: children.map((child) => String((child as JsonUINode)["id"])),
    id: String(node["id"]),
    properties: authoredProperties(node),
    type: String(node.$comp)
  };
}

function authoredProperties(node: JsonUINode): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(node).filter(([name]) => !["$children", "$comp", "id"].includes(name))
  );
}

function pickProperties(
  source: Readonly<Record<string, unknown>>,
  names: readonly string[]
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(names.map((name) => [name, source[name]]));
}

function requireNode<T>(value: T | undefined, id: string): T {
  if (value === undefined) throw new Error(`Parity node is missing: ${id}.`);
  return value;
}
