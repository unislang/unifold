import { UiControlNodeKind, UiNodeKind } from "@unislang/unifold-contracts";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { nodeKindForComponent } from "./node-kind.js";
import {
  parseControlTopology,
  type ParsedControlDefinition as ControlDefinition
} from "./control-topology-parser.js";
import type { CompilerDiagnostic } from "./types.js";
const aggregateKinds = new Set<UiControlNodeKind>([
  UiControlNodeKind.Array,
  UiControlNodeKind.Form,
  UiControlNodeKind.Group,
  UiControlNodeKind.Record
]);
const compatibleNodeKinds: Readonly<Record<UiControlNodeKind, ReadonlySet<UiNodeKind>>> = {
  [UiControlNodeKind.Array]: new Set([UiNodeKind.Component]),
  [UiControlNodeKind.Control]: new Set([UiNodeKind.Control]),
  [UiControlNodeKind.Form]: new Set([UiNodeKind.Form]),
  [UiControlNodeKind.Group]: new Set([UiNodeKind.Component]),
  [UiControlNodeKind.Record]: new Set([UiNodeKind.Component])
};

export function validateControlTopology(
  value: unknown,
  nodeComponents: ReadonlyMap<string, string>,
  diagnostics: CompilerDiagnostic[]
): void {
  const definitions = parseControlTopology(value, diagnostics);
  if (definitions !== undefined) validateDefinitions(definitions, nodeComponents, diagnostics);
}

function validateDefinitions(
  definitions: readonly ControlDefinition[],
  components: ReadonlyMap<string, string>,
  diagnostics: CompilerDiagnostic[]
): void {
  const byId = new Map<string, ControlDefinition>();
  definitions.forEach((definition) => registerDefinition(definition, byId, diagnostics));
  definitions.forEach((definition) => validateTarget(definition, components, diagnostics));
  definitions.forEach((definition) => validateRelationship(definition, byId, diagnostics));
  validateSiblingKeys(definitions, diagnostics);
  definitions.forEach((definition) => validateCycle(definition, byId, diagnostics));
  validateCoverage(byId, components, diagnostics);
}

function registerDefinition(
  definition: ControlDefinition,
  byId: Map<string, ControlDefinition>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (!byId.has(definition.id)) return void byId.set(definition.id, definition);
  add(
    diagnostics,
    `${definition.path}/id`,
    `Control id "${definition.id}" is duplicated.`,
    definition.id
  );
}

function validateTarget(
  definition: ControlDefinition,
  components: ReadonlyMap<string, string>,
  diagnostics: CompilerDiagnostic[]
): void {
  const component = components.get(definition.id);
  if (component === undefined) return missingTarget(definition, diagnostics);
  const inferred = nodeKindForComponent(component);
  if (!compatibleNodeKinds[definition.kind].has(inferred as UiNodeKind)) {
    incompatibleTarget(definition, component, diagnostics);
  }
}

function missingTarget(definition: ControlDefinition, diagnostics: CompilerDiagnostic[]): void {
  add(
    diagnostics,
    `${definition.path}/id`,
    `Control target "${definition.id}" is not a visual node.`,
    definition.id
  );
}

function incompatibleTarget(
  definition: ControlDefinition,
  component: string,
  diagnostics: CompilerDiagnostic[]
): void {
  add(
    diagnostics,
    `${definition.path}/kind`,
    `Control kind "${definition.kind}" is incompatible with component "${component}".`,
    definition.id
  );
}

function validateRelationship(
  definition: ControlDefinition,
  byId: ReadonlyMap<string, ControlDefinition>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (definition.parentId === undefined) validateRoot(definition, diagnostics);
  else validateNested({ ...definition, parentId: definition.parentId }, byId, diagnostics);
}

function validateRoot(definition: ControlDefinition, diagnostics: CompilerDiagnostic[]): void {
  if (definition.key !== undefined)
    add(
      diagnostics,
      `${definition.path}/key`,
      "A root control cannot declare a key.",
      definition.id
    );
  if (definition.kind !== UiControlNodeKind.Form)
    add(
      diagnostics,
      `${definition.path}/kind`,
      "A control topology root must be a form.",
      definition.id
    );
}

function validateNested(
  definition: ControlDefinition & { readonly parentId: string },
  byId: ReadonlyMap<string, ControlDefinition>,
  diagnostics: CompilerDiagnostic[]
): void {
  validateNestedKey(definition, diagnostics);
  validateNestedKind(definition, diagnostics);
  validateDistinctParent(definition, diagnostics);
  validateAggregateParent(definition, byId, diagnostics);
}

function validateNestedKey(definition: ControlDefinition, diagnostics: CompilerDiagnostic[]): void {
  if (definition.key === undefined)
    add(
      diagnostics,
      `${definition.path}/key`,
      "A nested control requires a durable key.",
      definition.id
    );
}

function validateNestedKind(
  definition: ControlDefinition,
  diagnostics: CompilerDiagnostic[]
): void {
  if (definition.kind === UiControlNodeKind.Form)
    add(
      diagnostics,
      `${definition.path}/kind`,
      "A form cannot be nested in another control.",
      definition.id
    );
}

function validateDistinctParent(
  definition: ControlDefinition & { readonly parentId: string },
  diagnostics: CompilerDiagnostic[]
): void {
  if (definition.parentId === definition.id)
    add(
      diagnostics,
      `${definition.path}/parentId`,
      "A control cannot parent itself.",
      definition.id
    );
}

function validateAggregateParent(
  definition: ControlDefinition & { readonly parentId: string },
  byId: ReadonlyMap<string, ControlDefinition>,
  diagnostics: CompilerDiagnostic[]
): void {
  const parent = byId.get(definition.parentId);
  if (parent === undefined) return unknownParent(definition, diagnostics);
  if (!aggregateKinds.has(parent.kind)) invalidParent(definition, diagnostics);
}

function unknownParent(
  definition: ControlDefinition & { readonly parentId: string },
  diagnostics: CompilerDiagnostic[]
): void {
  add(
    diagnostics,
    `${definition.path}/parentId`,
    `Unknown control parent "${definition.parentId}".`,
    definition.id
  );
}

function invalidParent(
  definition: ControlDefinition & { readonly parentId: string },
  diagnostics: CompilerDiagnostic[]
): void {
  add(
    diagnostics,
    `${definition.path}/parentId`,
    `Control parent "${definition.parentId}" cannot contain controls.`,
    definition.id
  );
}

function validateSiblingKeys(
  definitions: readonly ControlDefinition[],
  diagnostics: CompilerDiagnostic[]
): void {
  const keys = new Set<string>();
  definitions.forEach((definition) => validateSiblingKey(definition, keys, diagnostics));
}

function validateSiblingKey(
  definition: ControlDefinition,
  keys: Set<string>,
  diagnostics: CompilerDiagnostic[]
): void {
  const identity = siblingIdentity(definition);
  if (identity === undefined) return;
  if (keys.has(identity)) duplicateSiblingKey(definition, diagnostics);
  keys.add(identity);
}

function siblingIdentity(definition: ControlDefinition): string | undefined {
  if (definition.parentId === undefined) return undefined;
  if (definition.key === undefined) return undefined;
  return `${definition.parentId}\u0000${definition.key}`;
}

function duplicateSiblingKey(
  definition: ControlDefinition,
  diagnostics: CompilerDiagnostic[]
): void {
  add(
    diagnostics,
    `${definition.path}/key`,
    `Control key "${String(definition.key)}" is duplicated under "${String(definition.parentId)}".`,
    definition.id
  );
}

function validateCycle(
  definition: ControlDefinition,
  byId: ReadonlyMap<string, ControlDefinition>,
  diagnostics: CompilerDiagnostic[]
): void {
  const visited = new Set<string>();
  let current: ControlDefinition | undefined = definition;
  while (current !== undefined) {
    if (visited.has(current.id)) return cycleDiagnostic(definition, diagnostics);
    visited.add(current.id);
    current = parentDefinition(current, byId);
  }
}

function parentDefinition(
  definition: ControlDefinition,
  byId: ReadonlyMap<string, ControlDefinition>
): ControlDefinition | undefined {
  return definition.parentId === undefined ? undefined : byId.get(definition.parentId);
}

function cycleDiagnostic(definition: ControlDefinition, diagnostics: CompilerDiagnostic[]): void {
  add(
    diagnostics,
    `${definition.path}/parentId`,
    `Control topology contains a cycle through "${definition.id}".`,
    definition.id
  );
}

function validateCoverage(
  definitions: ReadonlyMap<string, ControlDefinition>,
  components: ReadonlyMap<string, string>,
  diagnostics: CompilerDiagnostic[]
): void {
  components.forEach((component, id) =>
    validateCoveredNode(component, id, definitions, diagnostics)
  );
}

function validateCoveredNode(
  component: string,
  id: string,
  definitions: ReadonlyMap<string, ControlDefinition>,
  diagnostics: CompilerDiagnostic[]
): void {
  if (!requiresCoverage(component)) return;
  if (!definitions.has(id))
    add(
      diagnostics,
      "/controls/nodes",
      `Control-capable visual node "${id}" must be declared in the explicit topology.`,
      id
    );
}

function requiresCoverage(component: string): boolean {
  return new Set([UiNodeKind.Control, UiNodeKind.Form]).has(
    nodeKindForComponent(component) as UiNodeKind
  );
}

function add(
  diagnostics: CompilerDiagnostic[],
  path: string,
  message: string,
  nodeId?: string
): void {
  diagnostics.push(errorDiagnostic(DiagnosticCode.InvalidControlTopology, message, path, nodeId));
}
