import type { JsonValue } from "@unislang/unifold-contracts";

import { CompositionDiagnosticCode, LayoutVariableType } from "./enums.js";
import type { CompositionDiagnostic } from "./types.js";

const exactReference = /^\{\{([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*)\}\}$/u;
const safeName = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/u;
const unsafeNames = new Set(["__proto__", "constructor", "prototype"]);
const variableKeys = new Set(["default", "required", "type"]);
const variableTypes = new Set(Object.values(LayoutVariableType));
const typeChecks: Readonly<Record<LayoutVariableType, (value: unknown) => boolean>> = {
  [LayoutVariableType.Array]: Array.isArray,
  [LayoutVariableType.Boolean]: (value) => typeof value === "boolean",
  [LayoutVariableType.Nodes]: Array.isArray,
  [LayoutVariableType.Number]: (value) => typeof value === "number",
  [LayoutVariableType.Object]: isLayoutObject,
  [LayoutVariableType.String]: (value) => typeof value === "string"
};

export function resolveLayoutVariables(
  definition: Readonly<Record<string, unknown>>,
  supplied: unknown,
  diagnostics: CompositionDiagnostic[]
): Readonly<Record<string, JsonValue>> | undefined {
  const inputs = variableInputs(definition["variables"], supplied, diagnostics);
  if (inputs === undefined) return undefined;
  const { actual, schema } = inputs;
  reportUnknownVariables(actual, schema, diagnostics);
  const result: Record<string, JsonValue> = {};
  Object.entries(schema).forEach(([name, raw]) =>
    resolveVariable(name, raw, actual, result, diagnostics)
  );
  return diagnostics.length === 0 ? result : undefined;
}

export function resolveLayoutValue(
  value: unknown,
  path: string,
  variables: Readonly<Record<string, JsonValue>>,
  diagnostics: CompositionDiagnostic[]
): unknown {
  const reference = referencePath(value);
  if (reference !== undefined) return resolveReference(reference, path, variables, diagnostics);
  return resolveLayoutContainer(value, path, variables, diagnostics);
}

function resolveLayoutContainer(
  value: unknown,
  path: string,
  variables: Readonly<Record<string, JsonValue>>,
  diagnostics: CompositionDiagnostic[]
): unknown {
  if (Array.isArray(value)) return resolveArray(value, path, variables, diagnostics);
  if (!isLayoutObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([name, item]) => [
      name,
      resolveLayoutValue(item, `${path}/${name}`, variables, diagnostics)
    ])
  );
}

function resolveArray(
  value: readonly unknown[],
  path: string,
  variables: Readonly<Record<string, JsonValue>>,
  diagnostics: CompositionDiagnostic[]
): unknown[] {
  return value.map((item, index) =>
    resolveLayoutValue(item, `${path}/${String(index)}`, variables, diagnostics)
  );
}

export function rejectUnknownLayoutKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  Object.keys(value)
    .filter((key) => !allowed.has(key))
    .forEach((key) =>
      addLayoutDiagnostic(
        diagnostics,
        CompositionDiagnosticCode.InvalidLayout,
        `${path}/${key}`,
        `Unknown field "${key}".`
      )
    );
}

export function isLayoutObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isSafeLayoutName(value: unknown): value is string {
  return typeof value === "string" && safeName.test(value) && !unsafeNames.has(value);
}

export function addLayoutDiagnostic(
  diagnostics: CompositionDiagnostic[],
  code: CompositionDiagnosticCode,
  path: string,
  message: string
): void {
  diagnostics.push({ code, message, path });
}

function resolveVariable(
  name: string,
  raw: unknown,
  supplied: Readonly<Record<string, unknown>>,
  result: Record<string, JsonValue>,
  diagnostics: CompositionDiagnostic[]
): void {
  const path = `/variables/${name}`;
  if (!isLayoutObject(raw)) return invalidVariableDefinition(path, diagnostics);
  rejectUnknownLayoutKeys(raw, variableKeys, path, diagnostics);
  const type = variableType(raw["type"], path, diagnostics);
  if (type === undefined) return;
  resolveVariableValue(name, raw, supplied, result, diagnostics, type, path);
}

function resolveVariableValue(
  name: string,
  definition: Readonly<Record<string, unknown>>,
  supplied: Readonly<Record<string, unknown>>,
  result: Record<string, JsonValue>,
  diagnostics: CompositionDiagnostic[],
  type: LayoutVariableType,
  path: string
): void {
  const value = supplied[name] ?? definition["default"];
  if (value === undefined) return requireVariable(name, definition, path, diagnostics);
  storeVariableValue(name, value, result, diagnostics, type, path);
}

function storeVariableValue(
  name: string,
  value: unknown,
  result: Record<string, JsonValue>,
  diagnostics: CompositionDiagnostic[],
  type: LayoutVariableType,
  path: string
): void {
  if (!matchesType(value, type)) return invalidVariableValue(name, type, path, diagnostics);
  result[name] = structuredClone(value) as JsonValue;
}

function requireVariable(
  name: string,
  definition: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  if (definition["required"] === true)
    addLayoutDiagnostic(
      diagnostics,
      CompositionDiagnosticCode.InvalidLayoutVariable,
      path,
      `Required variable "${name}" is missing.`
    );
}

function referencePath(value: unknown): string | undefined {
  if (typeof value === "string") return exactReference.exec(value)?.[1];
  return objectReferencePath(value);
}

function resolveReference(
  reference: string,
  path: string,
  variables: Readonly<Record<string, JsonValue>>,
  diagnostics: CompositionDiagnostic[]
): unknown {
  if (!exactReference.test(`{{${reference}}}`))
    return unknownReference(reference, path, diagnostics);
  const resolved = walkReference(reference, variables);
  if (resolved.status === "missing") return unknownReference(reference, path, diagnostics);
  return structuredClone(resolved.value);
}

function walkReference(
  reference: string,
  variables: Readonly<Record<string, JsonValue>>
): ReferencePart {
  let current: unknown = variables;
  for (const part of reference.split(".")) {
    const next = referencePart(current, part);
    if (next.status === "missing") return next;
    current = next.value;
  }
  return { status: "found", value: current };
}

function unknownReference(
  reference: string,
  path: string,
  diagnostics: CompositionDiagnostic[]
): undefined {
  addLayoutDiagnostic(
    diagnostics,
    CompositionDiagnosticCode.UnknownLayoutVariable,
    path,
    `Unknown layout variable reference "${reference}".`
  );
  return undefined;
}

function matchesType(value: unknown, type: LayoutVariableType): boolean {
  const check = typeChecks[type];
  return check(value);
}

function variableInputs(
  schema: unknown,
  actual: unknown,
  diagnostics: CompositionDiagnostic[]
):
  | { actual: Readonly<Record<string, unknown>>; schema: Readonly<Record<string, unknown>> }
  | undefined {
  if (isLayoutObject(schema) && isLayoutObject(actual)) return { actual, schema };
  addLayoutDiagnostic(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayoutVariable,
    "/variables",
    "Variables and their schema must be objects."
  );
  return undefined;
}

function reportUnknownVariables(
  actual: Readonly<Record<string, unknown>>,
  schema: Readonly<Record<string, unknown>>,
  diagnostics: CompositionDiagnostic[]
): void {
  Object.keys(actual)
    .filter((name) => !Object.hasOwn(schema, name))
    .forEach((name) =>
      addLayoutDiagnostic(
        diagnostics,
        CompositionDiagnosticCode.UnknownLayoutVariable,
        `/variables/${name}`,
        `Unknown layout variable "${name}".`
      )
    );
}

function invalidVariableDefinition(path: string, diagnostics: CompositionDiagnostic[]): void {
  addLayoutDiagnostic(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayoutVariable,
    path,
    "Variable definition must be an object."
  );
}

function variableType(
  value: unknown,
  path: string,
  diagnostics: CompositionDiagnostic[]
): LayoutVariableType | undefined {
  if (isVariableType(value)) return value;
  addLayoutDiagnostic(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayoutVariable,
    path,
    "Variable type is unsupported."
  );
  return undefined;
}

function isVariableType(value: unknown): value is LayoutVariableType {
  return typeof value === "string" && variableTypes.has(value as LayoutVariableType);
}

function invalidVariableValue(
  name: string,
  type: LayoutVariableType,
  path: string,
  diagnostics: CompositionDiagnostic[]
): void {
  addLayoutDiagnostic(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayoutVariable,
    path,
    `Variable "${name}" must be ${type}.`
  );
}

function objectReferencePath(value: unknown): string | undefined {
  if (!isLayoutObject(value)) return undefined;
  if (Object.keys(value).length !== 1) return undefined;
  return objectReferenceValue(value);
}

function objectReferenceValue(value: Readonly<Record<string, unknown>>): string | undefined {
  return typeof value["$var"] === "string" ? value["$var"] : undefined;
}

type ReferencePart =
  | { readonly status: "found"; readonly value: unknown }
  | { readonly status: "missing" };

function referencePart(value: unknown, part: string): ReferencePart {
  if (!isLayoutObject(value)) return { status: "missing" };
  return objectReferencePart(value, part);
}

function objectReferencePart(
  value: Readonly<Record<string, unknown>>,
  part: string
): ReferencePart {
  if (unsafeNames.has(part)) return { status: "missing" };
  return Object.hasOwn(value, part)
    ? { status: "found", value: value[part] }
    : { status: "missing" };
}
