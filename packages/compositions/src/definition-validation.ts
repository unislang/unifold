import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";

import { CompositionDiagnosticCode } from "./enums.js";
import { validateCompositionControlTopology } from "./composition-control-validation.js";
import { detectDefinitionCycles, type CompositionEdge } from "./definition-cycle-validation.js";
import { compositionError } from "./diagnostics.js";
import { isCompositionParameterValue } from "./parameters.js";
import { childPath } from "./path.js";
import { compositionKey, type CompositionRegistry } from "./registry.js";
import type { CompositionDefinition, CompositionDiagnostic, CompositionInstance } from "./types.js";

interface DefinitionFacts {
  readonly localIds: Map<string, string>;
  readonly nested: CompositionEdge[];
  readonly ownedPlainIds: Map<string, string>;
  readonly slotUses: Map<string, string[]>;
}

export function validateCompositionDefinitions(
  definitions: readonly CompositionDefinition[],
  registry: CompositionRegistry,
  diagnostics: CompositionDiagnostic[]
): void {
  const adjacency = new Map<string, readonly CompositionEdge[]>();
  definitions.forEach((definition, index) => {
    const path = childPath("/compositions", index);
    const facts = inspectDefinition(definition, path, diagnostics);
    validateDefinitionFacts(definition, facts, path, registry, diagnostics);
    adjacency.set(compositionKey(definition.name, definition.version), facts.nested);
  });
  detectDefinitionCycles(adjacency, diagnostics);
}

function inspectDefinition(
  definition: CompositionDefinition,
  path: string,
  diagnostics: CompositionDiagnostic[]
): DefinitionFacts {
  const facts: DefinitionFacts = {
    localIds: new Map(),
    nested: [],
    ownedPlainIds: new Map(),
    slotUses: new Map()
  };
  inspectTemplateNode(definition.template, childPath(path, "template"), facts, diagnostics);
  inspectParameterReferences(
    definition.template,
    childPath(path, "template"),
    definition,
    diagnostics
  );
  validateParameterDefaults(definition, path, diagnostics);
  return facts;
}

function inspectTemplateNode(
  node: JsonObject,
  path: string,
  facts: DefinitionFacts,
  diagnostics: CompositionDiagnostic[]
): void {
  if (isSlotPlaceholder(node)) {
    recordSlotUse(node.$slot, path, facts);
    return;
  }
  const id = node["id"] as string;
  recordLocalId(id, path, facts, diagnostics);
  if (isCompositionInstance(node)) facts.nested.push(compositionEdge(node, path));
  else facts.ownedPlainIds.set(id, path);
  inspectTemplateChildren(node, path, facts, diagnostics);
}

function inspectTemplateChildren(
  node: JsonObject,
  path: string,
  facts: DefinitionFacts,
  diagnostics: CompositionDiagnostic[]
): void {
  const children = node["$children"];
  if (!Array.isArray(children)) return;
  children.forEach((child, index) =>
    inspectTemplateNode(
      child as JsonObject,
      childPath(childPath(path, "$children"), index),
      facts,
      diagnostics
    )
  );
}

function recordLocalId(
  id: string,
  path: string,
  facts: DefinitionFacts,
  diagnostics: CompositionDiagnostic[]
): void {
  if (!facts.localIds.has(id)) {
    facts.localIds.set(id, path);
    return;
  }
  diagnostics.push(
    compositionError(
      CompositionDiagnosticCode.DuplicateNodeId,
      path,
      `Composition template local id is duplicated: ${id}.`
    )
  );
}

function recordSlotUse(name: string, path: string, facts: DefinitionFacts): void {
  const uses = facts.slotUses.get(name) ?? [];
  uses.push(path);
  facts.slotUses.set(name, uses);
}

function inspectParameterReferences(
  value: JsonValue,
  path: string,
  definition: CompositionDefinition,
  diagnostics: CompositionDiagnostic[]
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      inspectParameterReferences(item, childPath(path, index), definition, diagnostics)
    );
    return;
  }
  if (!isObject(value)) return;
  inspectParameterReference(value, path, definition, diagnostics);
  Object.entries(value).forEach(([name, item]) =>
    inspectParameterReferences(item as JsonValue, childPath(path, name), definition, diagnostics)
  );
}

function inspectParameterReference(
  value: JsonObject,
  path: string,
  definition: CompositionDefinition,
  diagnostics: CompositionDiagnostic[]
): void {
  if (!("$parameter" in value)) return;
  inspectExistingParameterReference(value, path, definition, diagnostics);
}

function inspectExistingParameterReference(
  value: JsonObject,
  path: string,
  definition: CompositionDefinition,
  diagnostics: CompositionDiagnostic[]
): void {
  const name = value["$parameter"];
  if (!isExactParameterReference(value, name)) {
    diagnostics.push(invalidParameterReference(path));
    return;
  }
  if (definition.parameters[name] === undefined)
    diagnostics.push(unknownParameterReference(name, path));
}

function isExactParameterReference(value: JsonObject, name: JsonValue | undefined): name is string {
  return Object.keys(value).length === 1 && typeof name === "string";
}

function validateParameterDefaults(
  definition: CompositionDefinition,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  Object.entries(definition.parameters).forEach(([name, parameter]) => {
    if (parameter.default === undefined) return;
    if (isCompositionParameterValue(parameter.type, parameter.default)) return;
    diagnostics.push(
      compositionError(
        CompositionDiagnosticCode.InvalidParameter,
        childPath(childPath(childPath(path, "parameters"), name), "default"),
        `Default for parameter ${name} must be ${parameter.type}.`
      )
    );
  });
}

function validateDefinitionFacts(
  definition: CompositionDefinition,
  facts: DefinitionFacts,
  path: string,
  registry: CompositionRegistry,
  diagnostics: CompositionDiagnostic[]
): void {
  validateSlots(definition, facts, path, diagnostics);
  validateExports(definition, facts, path, diagnostics);
  validateCompositionControlTopology(definition, facts.ownedPlainIds, path, diagnostics);
  facts.nested.forEach((edge) => {
    if (!registry.has(edge.key)) diagnostics.push(unknownComposition(edge));
  });
}

function validateSlots(
  definition: CompositionDefinition,
  facts: DefinitionFacts,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  const declared = new Set<string>();
  definition.slots.forEach((slot, index) => {
    if (declared.has(slot.name)) diagnostics.push(duplicateSlot(slot.name, path, index));
    declared.add(slot.name);
    validateSlotUses(slot.name, facts.slotUses.get(slot.name) ?? [], path, diagnostics);
  });
  facts.slotUses.forEach((paths, name) => {
    if (!declared.has(name)) diagnostics.push(unknownSlot(name, paths[0] as string));
  });
}

function validateSlotUses(
  name: string,
  paths: readonly string[],
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  if (paths.length === 0) diagnostics.push(missingSlotPlaceholder(name, path));
  if (paths.length > 1) diagnostics.push(duplicateSlotPlaceholder(name, paths[1] as string));
}

function validateExports(
  definition: CompositionDefinition,
  facts: DefinitionFacts,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  Object.entries(definition.exports).forEach(([alias, descriptor]) => {
    if (facts.localIds.has(descriptor.localId)) return;
    diagnostics.push(
      compositionError(
        CompositionDiagnosticCode.UnknownExport,
        childPath(childPath(path, "exports"), alias),
        `Composition export ${alias} references unknown local id ${descriptor.localId}.`
      )
    );
  });
}

function compositionEdge(instance: CompositionInstance, path: string): CompositionEdge {
  return {
    key: compositionKey(instance.$compose, instance.$version),
    label: `${instance.$compose}@${instance.$version}`,
    path
  };
}

function duplicateSlot(name: string, path: string, index: number): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.DuplicateSlot,
    childPath(childPath(path, "slots"), index),
    `Composition slot is declared more than once: ${name}.`
  );
}

function missingSlotPlaceholder(name: string, path: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.MissingSlotPlaceholder,
    childPath(path, "template"),
    `Declared composition slot has no template placeholder: ${name}.`
  );
}

function duplicateSlotPlaceholder(name: string, path: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.DuplicateSlotPlaceholder,
    path,
    `Composition slot placeholder is repeated: ${name}.`
  );
}

function unknownSlot(name: string, path: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.UnknownSlot,
    path,
    `Template references an undeclared composition slot: ${name}.`
  );
}

function invalidParameterReference(path: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.InvalidParameterReference,
    path,
    "A parameter reference must contain only a string $parameter property."
  );
}

function unknownParameterReference(name: string, path: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.UnknownParameter,
    path,
    `Template references an undeclared composition parameter: ${name}.`
  );
}

function unknownComposition(edge: CompositionEdge): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.UnknownComposition,
    edge.path,
    `Composition definition was not found: ${edge.label}.`
  );
}

function isCompositionInstance(value: JsonObject): value is CompositionInstance {
  return typeof value["$compose"] === "string";
}

function isSlotPlaceholder(value: JsonObject): value is JsonObject & { readonly $slot: string } {
  return typeof value["$slot"] === "string";
}

function isObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
