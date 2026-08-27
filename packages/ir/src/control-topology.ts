import {
  UiControlNodeKind,
  UiNodeKind,
  type UiControlNodeDefinition,
  type UiControlTopologyDefinition
} from "@unislang/unifold-contracts";

export interface ControlTopologyIndex {
  readonly childrenByParent: ReadonlyMap<string, readonly string[]>;
  readonly definitionsById: ReadonlyMap<string, UiControlNodeDefinition>;
}

interface IrControlTopologyFields {
  readonly controlChildIds: readonly string[];
  readonly controlKey?: string;
  readonly controlParentId?: string;
  readonly kind: UiNodeKind;
}

const kindMap: Readonly<Record<UiControlNodeKind, UiNodeKind>> = {
  [UiControlNodeKind.Array]: UiNodeKind.Array,
  [UiControlNodeKind.Control]: UiNodeKind.Control,
  [UiControlNodeKind.Form]: UiNodeKind.Form,
  [UiControlNodeKind.Group]: UiNodeKind.Group,
  [UiControlNodeKind.Record]: UiNodeKind.Record
};

export function indexControlTopology(
  topology: UiControlTopologyDefinition | undefined
): ControlTopologyIndex {
  const definitions = topology?.nodes ?? [];
  return {
    childrenByParent: childIndex(definitions),
    definitionsById: new Map(definitions.map((definition) => [definition.id, definition]))
  };
}

export function controlTopologyFields(
  id: string,
  topology: ControlTopologyIndex
): IrControlTopologyFields | undefined {
  const definition = topology.definitionsById.get(id);
  if (definition === undefined) return undefined;
  return {
    controlChildIds: topology.childrenByParent.get(id) ?? [],
    kind: kindMap[definition.kind],
    ...controlKeyField(definition),
    ...controlParentField(definition)
  };
}

export function controlScopePath(
  id: string,
  visualScopePath: readonly string[],
  topology: ControlTopologyIndex
): readonly string[] {
  const logical = logicalScopePath(id, topology.definitionsById);
  if (logical.length === 0) return visualScopePath;
  return uniqueIds([...visualScopePath.slice(0, -1), ...logical]);
}

function logicalScopePath(
  id: string,
  definitions: ReadonlyMap<string, UiControlNodeDefinition>
): readonly string[] {
  const path: string[] = [];
  let current = definitions.get(id);
  while (current !== undefined) {
    path.push(current.id);
    current = current.parentId === undefined ? undefined : definitions.get(current.parentId);
  }
  return path.reverse();
}

function uniqueIds(ids: readonly string[]): readonly string[] {
  return [...new Set(ids)];
}

function controlKeyField(definition: UiControlNodeDefinition): { readonly controlKey?: string } {
  return definition.key === undefined ? {} : { controlKey: definition.key };
}

function controlParentField(definition: UiControlNodeDefinition): {
  readonly controlParentId?: string;
} {
  return definition.parentId === undefined ? {} : { controlParentId: definition.parentId };
}

function childIndex(
  definitions: readonly UiControlNodeDefinition[]
): ReadonlyMap<string, readonly string[]> {
  const children = new Map<string, string[]>();
  definitions.forEach((definition) => appendChild(children, definition));
  return children;
}

function appendChild(children: Map<string, string[]>, definition: UiControlNodeDefinition): void {
  if (definition.parentId === undefined) return;
  const siblings = children.get(definition.parentId) ?? [];
  siblings.push(definition.id);
  children.set(definition.parentId, siblings);
}
