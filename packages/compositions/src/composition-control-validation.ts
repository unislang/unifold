import { UiControlNodeKind, type UiControlNodeDefinition } from "@unislang/unifold-contracts";

import { compositionError } from "./diagnostics.js";
import { CompositionDiagnosticCode } from "./enums.js";
import { childPath } from "./path.js";
import type { CompositionDefinition, CompositionDiagnostic } from "./types.js";

export function validateCompositionControlTopology(
  definition: CompositionDefinition,
  localIds: ReadonlyMap<string, string>,
  definitionPath: string,
  diagnostics: CompositionDiagnostic[]
): void {
  const nodes = definition.controls?.nodes;
  if (nodes === undefined) return;
  const byId = indexNodes(nodes, localIds, definitionPath, diagnostics);
  validateRoot(nodes, definitionPath, diagnostics);
  validateRelationships(nodes, byId, definitionPath, diagnostics);
  validateSiblingKeys(nodes, definitionPath, diagnostics);
  nodes.forEach((node, index) => validateCycle(node, index, byId, definitionPath, diagnostics));
}

function indexNodes(
  nodes: readonly UiControlNodeDefinition[],
  localIds: ReadonlyMap<string, string>,
  definitionPath: string,
  diagnostics: CompositionDiagnostic[]
): Map<string, UiControlNodeDefinition> {
  const byId = new Map<string, UiControlNodeDefinition>();
  nodes.forEach((node, index) => {
    const path = controlNodePath(definitionPath, index);
    if (!localIds.has(node.id)) diagnostics.push(unknownNode(node.id, path));
    if (!byId.has(node.id)) byId.set(node.id, node);
    else diagnostics.push(duplicateNode(node.id, path));
  });
  return byId;
}

function validateRoot(
  nodes: readonly UiControlNodeDefinition[],
  definitionPath: string,
  diagnostics: CompositionDiagnostic[]
): void {
  const roots = nodes.filter(({ parentId }) => parentId === undefined);
  if (roots.length !== 1) {
    diagnostics.push(invalidTopology(definitionPath, 0, "Topology requires one unkeyed root."));
    return;
  }
  const root = roots[0] as UiControlNodeDefinition;
  if (root.key === undefined) return;
  diagnostics.push(invalidTopology(definitionPath, 0, "Topology requires one unkeyed root."));
}

function validateRelationships(
  nodes: readonly UiControlNodeDefinition[],
  byId: ReadonlyMap<string, UiControlNodeDefinition>,
  definitionPath: string,
  diagnostics: CompositionDiagnostic[]
): void {
  nodes.forEach((node, index) =>
    validateRelationship(node, index, byId, definitionPath, diagnostics)
  );
}

function validateRelationship(
  node: UiControlNodeDefinition,
  index: number,
  byId: ReadonlyMap<string, UiControlNodeDefinition>,
  definitionPath: string,
  diagnostics: CompositionDiagnostic[]
): void {
  if (node.parentId === undefined) return;
  validateKnownParent(node.parentId, index, byId, definitionPath, diagnostics);
  validateNestedKey(node, index, definitionPath, diagnostics);
  validateNestedKind(node, index, definitionPath, diagnostics);
}

function validateKnownParent(
  parentId: string,
  index: number,
  byId: ReadonlyMap<string, UiControlNodeDefinition>,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  const parent = byId.get(parentId);
  if (parent === undefined) diagnostics.push(unknownParent(parentId, path, index));
  else if (parent.kind === UiControlNodeKind.Control)
    diagnostics.push(invalidTopology(path, index, "Control parents must be aggregate."));
}

function validateNestedKey(
  node: UiControlNodeDefinition,
  index: number,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  if (node.key === undefined)
    diagnostics.push(invalidTopology(path, index, "Nested controls require a key."));
}

function validateNestedKind(
  node: UiControlNodeDefinition,
  index: number,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  if (node.kind === UiControlNodeKind.Form)
    diagnostics.push(invalidTopology(path, index, "Forms cannot be nested."));
}

function validateSiblingKeys(
  nodes: readonly UiControlNodeDefinition[],
  definitionPath: string,
  diagnostics: CompositionDiagnostic[]
): void {
  const keys = new Set<string>();
  nodes.forEach((node, index) =>
    validateSiblingKey(node, index, keys, definitionPath, diagnostics)
  );
}

function validateSiblingKey(
  node: UiControlNodeDefinition,
  index: number,
  keys: Set<string>,
  definitionPath: string,
  diagnostics: CompositionDiagnostic[]
): void {
  const identity = siblingIdentity(node);
  if (identity === undefined) return;
  if (!keys.has(identity)) return void keys.add(identity);
  diagnostics.push(invalidTopology(definitionPath, index, `Duplicate control key ${node.key}.`));
}

function siblingIdentity(node: UiControlNodeDefinition): string | undefined {
  if (node.parentId === undefined) return undefined;
  if (node.key === undefined) return undefined;
  return `${node.parentId}\u0000${node.key}`;
}

function validateCycle(
  node: UiControlNodeDefinition,
  index: number,
  byId: ReadonlyMap<string, UiControlNodeDefinition>,
  definitionPath: string,
  diagnostics: CompositionDiagnostic[]
): void {
  const visited = new Set<string>();
  let current: UiControlNodeDefinition | undefined = node;
  while (current !== undefined) {
    if (visited.has(current.id))
      return void diagnostics.push(
        invalidTopology(definitionPath, index, `Control cycle at ${node.id}.`)
      );
    visited.add(current.id);
    current = parentNode(current, byId);
  }
}

function parentNode(
  node: UiControlNodeDefinition,
  byId: ReadonlyMap<string, UiControlNodeDefinition>
): UiControlNodeDefinition | undefined {
  return node.parentId === undefined ? undefined : byId.get(node.parentId);
}

function unknownNode(id: string, path: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.UnknownControlNode,
    childPath(path, "id"),
    `Composition control references unknown local id ${id}.`
  );
}

function duplicateNode(id: string, path: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.DuplicateControlNodeId,
    childPath(path, "id"),
    `Composition control id is duplicated: ${id}.`
  );
}

function unknownParent(id: string, definitionPath: string, index: number): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.UnknownControlParent,
    childPath(controlNodePath(definitionPath, index), "parentId"),
    `Composition control references unknown local parent ${id}.`
  );
}

function invalidTopology(
  definitionPath: string,
  index: number,
  message: string
): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.InvalidControlTopology,
    controlNodePath(definitionPath, index),
    message
  );
}

function controlNodePath(definitionPath: string, index: number): string {
  return childPath(childPath(childPath(definitionPath, "controls"), "nodes"), index);
}
