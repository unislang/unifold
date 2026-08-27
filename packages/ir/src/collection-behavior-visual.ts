import {
  ComponentProgrammaticFocusBehavior,
  componentProgrammaticFocusBehavior
} from "@unislang/unifold-catalog";

import { isPlainObject } from "./json-safety.js";

interface CollectionVisualNode {
  readonly childIds: readonly string[];
  readonly componentType: string;
  readonly disabled: boolean;
}

export function collectionVisualNodeIndex(
  view: unknown
): ReadonlyMap<string, CollectionVisualNode> {
  const nodes = new Map<string, CollectionVisualNode>();
  const pending: unknown[] = [view];
  for (const value of pending) {
    const node = visualNode(value);
    if (node === undefined) continue;
    nodes.set(node.id, node.definition);
    pending.push(...visualChildren(value));
  }
  return nodes;
}

export function collectionHasFocusDestination(
  rootId: string,
  nodes: ReadonlyMap<string, CollectionVisualNode>
): boolean {
  const pending = [rootId];
  for (const id of pending) {
    const node = nodes.get(id);
    if (isEnabledFocusNode(node)) return true;
    pending.push(...visualChildIds(node));
  }
  return false;
}

function visualChildIds(node: CollectionVisualNode | undefined): readonly string[] {
  return node === undefined ? [] : node.childIds;
}

function isEnabledFocusNode(node: CollectionVisualNode | undefined): boolean {
  if (node === undefined) return false;
  if (node.disabled) return false;
  return (
    componentProgrammaticFocusBehavior(node.componentType) !==
    ComponentProgrammaticFocusBehavior.None
  );
}

function visualNode(
  value: unknown
): { readonly definition: CollectionVisualNode; readonly id: string } | undefined {
  if (!isPlainObject(value)) return undefined;
  return identifiedVisualNode(value);
}

function identifiedVisualNode(
  value: Readonly<Record<string, unknown>>
): { readonly definition: CollectionVisualNode; readonly id: string } | undefined {
  const id = value["id"];
  const componentType = value["$comp"];
  if (typeof id !== "string") return undefined;
  if (typeof componentType !== "string") return undefined;
  return {
    definition: {
      childIds: visualChildren(value).flatMap(childId),
      componentType,
      disabled: value["disabled"] === true
    },
    id
  };
}

function visualChildren(value: unknown): readonly unknown[] {
  if (!isPlainObject(value)) return [];
  return Array.isArray(value["$children"]) ? value["$children"] : [];
}

function childId(value: unknown): readonly string[] {
  if (!isPlainObject(value)) return [];
  return typeof value["id"] === "string" ? [value["id"]] : [];
}
