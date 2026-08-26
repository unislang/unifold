import { CompositionDiagnosticCode } from "./enums.js";
import { compositionError } from "./diagnostics.js";
import type { CompositionDefinition, CompositionDiagnostic } from "./types.js";

export type CompositionRegistry = ReadonlyMap<string, CompositionDefinition>;

export function createCompositionRegistry(
  definitions: readonly CompositionDefinition[],
  diagnostics: CompositionDiagnostic[]
): CompositionRegistry {
  const registry = new Map<string, CompositionDefinition>();
  definitions.forEach((definition, index) => {
    const key = compositionKey(definition.name, definition.version);
    if (registry.has(key)) diagnostics.push(duplicateDefinition(definition, index));
    else registry.set(key, definition);
  });
  return registry;
}

export function compositionKey(name: string, version: string): string {
  return JSON.stringify([name, version]);
}

function duplicateDefinition(
  definition: CompositionDefinition,
  index: number
): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.DuplicateDefinition,
    `/compositions/${index}`,
    `Composition definition is duplicated: ${definition.name}@${definition.version}.`
  );
}
