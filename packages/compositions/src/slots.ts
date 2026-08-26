import type { JsonObject } from "@unislang/unifold-contracts";

import { CompositionDiagnosticCode } from "./enums.js";
import { compositionError } from "./diagnostics.js";
import type { CompositionSlotContext } from "./expansion-context.js";
import { childPath } from "./path.js";
import type {
  CompositionDefinition,
  CompositionDiagnostic,
  CompositionInstance,
  CompositionSlotDefinition
} from "./types.js";

export function createCompositionSlotContext(
  definition: CompositionDefinition,
  instance: CompositionInstance,
  path: string,
  diagnostics: CompositionDiagnostic[]
): CompositionSlotContext {
  const definitions = indexSlotDefinitions(definition, path, diagnostics);
  const values = instance.slots ?? {};
  reportUnknownSlots(definitions, values, path, diagnostics);
  reportInvalidSlotCounts(definitions, values, path, diagnostics);
  return { definitions, uses: new Map(), values };
}

export function consumeCompositionSlot(
  name: string,
  context: CompositionSlotContext,
  path: string,
  diagnostics: CompositionDiagnostic[]
): readonly JsonObject[] {
  if (!isKnownSlot(name, context, path, diagnostics)) return [];
  recordSlotUse(name, context, path, diagnostics);
  return context.values[name] ?? [];
}

function isKnownSlot(
  name: string,
  context: CompositionSlotContext,
  path: string,
  diagnostics: CompositionDiagnostic[]
): boolean {
  if (context.definitions.has(name)) return true;
  diagnostics.push(unknownSlot(name, path));
  return false;
}

function recordSlotUse(
  name: string,
  context: CompositionSlotContext,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  const useCount = nextSlotUseCount(name, context);
  context.uses.set(name, useCount);
  if (useCount > 1) diagnostics.push(duplicatePlaceholder(name, path));
}

function nextSlotUseCount(name: string, context: CompositionSlotContext): number {
  return (context.uses.get(name) ?? 0) + 1;
}

export function reportMissingSlotPlaceholders(
  context: CompositionSlotContext,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  context.definitions.forEach((_definition, name) => {
    if (context.uses.has(name)) return;
    diagnostics.push(
      compositionError(
        CompositionDiagnosticCode.MissingSlotPlaceholder,
        childPath(childPath(path, "slots"), name),
        `Declared composition slot has no template placeholder: ${name}.`
      )
    );
  });
}

function indexSlotDefinitions(
  definition: CompositionDefinition,
  path: string,
  diagnostics: CompositionDiagnostic[]
): ReadonlyMap<string, CompositionSlotDefinition> {
  const definitions = new Map<string, CompositionSlotDefinition>();
  definition.slots.forEach((slot, index) => {
    if (definitions.has(slot.name)) diagnostics.push(duplicateSlot(slot.name, path, index));
    else definitions.set(slot.name, slot);
  });
  return definitions;
}

function reportUnknownSlots(
  definitions: ReadonlyMap<string, CompositionSlotDefinition>,
  values: Readonly<Record<string, readonly JsonObject[]>>,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  Object.keys(values).forEach((name) => {
    if (definitions.has(name)) return;
    diagnostics.push(unknownSlot(name, childPath(childPath(path, "slots"), name)));
  });
}

function reportInvalidSlotCounts(
  definitions: ReadonlyMap<string, CompositionSlotDefinition>,
  values: Readonly<Record<string, readonly JsonObject[]>>,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  definitions.forEach((definition, name) => {
    const count = values[name]?.length ?? 0;
    reportInvalidSlotCount(definition, name, count, path, diagnostics);
  });
}

function reportInvalidSlotCount(
  definition: CompositionSlotDefinition,
  name: string,
  count: number,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  if (missingRequiredSlot(definition, count)) diagnostics.push(missingSlot(name, path));
  if (overfilledSingleSlot(definition, count)) diagnostics.push(multipleSlot(name, path));
}

function missingRequiredSlot(definition: CompositionSlotDefinition, count: number): boolean {
  return definition.required && count === 0;
}

function overfilledSingleSlot(definition: CompositionSlotDefinition, count: number): boolean {
  return !definition.multiple && count > 1;
}

function duplicateSlot(name: string, path: string, index: number): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.DuplicateSlot,
    childPath(childPath(path, "definitionSlots"), index),
    `Composition slot is declared more than once: ${name}.`
  );
}

function unknownSlot(name: string, path: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.UnknownSlot,
    path,
    `Unknown composition slot: ${name}.`
  );
}

function missingSlot(name: string, path: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.MissingSlot,
    childPath(childPath(path, "slots"), name),
    `Required composition slot is missing: ${name}.`
  );
}

function multipleSlot(name: string, path: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.MultipleSlot,
    childPath(childPath(path, "slots"), name),
    `Composition slot accepts only one node: ${name}.`
  );
}

function duplicatePlaceholder(name: string, path: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.DuplicateSlotPlaceholder,
    path,
    `Composition slot placeholder is repeated: ${name}.`
  );
}
