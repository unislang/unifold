import { compileSchema, draft2020, type JsonError, type JsonSchema } from "json-schema-library";

import schema from "./composed-ui-document.schema.json" with { type: "json" };
import { CompositionDiagnosticCode } from "./enums.js";
import { compositionError } from "./diagnostics.js";
import type { ComposedUiDocument, CompositionDiagnostic } from "./types.js";

const validator = compileSchema(schema as JsonSchema, {
  drafts: [draft2020],
  throwOnInvalidRef: true,
  throwOnInvalidSchema: true
});
const unsafePropertyNames = new Set(["__proto__", "constructor", "prototype"]);
const safeObjectPrototypes = new Set([Object.prototype, null]);

interface PendingValue {
  readonly path: string;
  readonly value: unknown;
}

export function validateComposedDocument(value: unknown): {
  readonly diagnostics: readonly CompositionDiagnostic[];
  readonly document?: ComposedUiDocument;
} {
  const unsafeDiagnostic = unsafePropertyDiagnostic(value);
  if (unsafeDiagnostic !== undefined) return { diagnostics: [unsafeDiagnostic] };
  const result = validator.validate(value);
  if (result.valid) return { diagnostics: [], document: value as ComposedUiDocument };
  return { diagnostics: schemaDiagnostics(result.errors) };
}

function unsafePropertyDiagnostic(value: unknown): CompositionDiagnostic | undefined {
  const pending: PendingValue[] = [{ path: "/", value }];
  const seen = new WeakSet<object>();
  while (pending.length > 0) {
    const current = pending.pop() as PendingValue;
    const diagnostic = inspectProperties(current, pending, seen);
    if (diagnostic !== undefined) return diagnostic;
  }
  return undefined;
}

function inspectProperties(
  current: PendingValue,
  pending: PendingValue[],
  seen: WeakSet<object>
): CompositionDiagnostic | undefined {
  const object = recordValue(current.value);
  if (object === undefined) return undefined;
  return inspectObject(current, object, pending, seen);
}

function inspectObject(
  current: PendingValue,
  object: Record<string, unknown>,
  pending: PendingValue[],
  seen: WeakSet<object>
): CompositionDiagnostic | undefined {
  const prototypeDiagnostic = unsafePrototypeDiagnostic(current, object);
  if (prototypeDiagnostic !== undefined) return prototypeDiagnostic;
  const entries = unvisitedEntries(object, seen);
  if (entries === undefined) return undefined;
  return inspectEntries(current, entries, pending);
}

function inspectEntries(
  current: PendingValue,
  entries: [string, unknown][],
  pending: PendingValue[]
): CompositionDiagnostic | undefined {
  const unsafe = entries.find(([key]) => unsafePropertyNames.has(key));
  if (unsafe !== undefined) return unsafePropertyError(current.path, unsafe[0]);
  entries.forEach(([key, value]) => pending.push({ path: childPath(current.path, key), value }));
  return undefined;
}

function unvisitedEntries(
  object: Record<string, unknown>,
  seen: WeakSet<object>
): [string, unknown][] | undefined {
  if (seen.has(object)) return undefined;
  seen.add(object);
  return Object.entries(object);
}

function unsafePrototypeDiagnostic(
  current: PendingValue,
  object: Record<string, unknown>
): CompositionDiagnostic | undefined {
  if (Array.isArray(object)) return undefined;
  if (safeObjectPrototypes.has(Object.getPrototypeOf(object))) return undefined;
  return unsafePropertyError(current.path, "[[Prototype]]");
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  if (value === null) return undefined;
  return typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function unsafePropertyError(path: string, property: string): CompositionDiagnostic {
  return compositionError(
    CompositionDiagnosticCode.InvalidDocument,
    path,
    `Property name '${property}' is not allowed.`
  );
}

function childPath(path: string, property: string): string {
  const segment = property.replaceAll("~", "~0").replaceAll("/", "~1");
  return path === "/" ? `/${segment}` : `${path}/${segment}`;
}

function schemaDiagnostics(errors: readonly JsonError[]): CompositionDiagnostic[] {
  return errors.map((error) => {
    return compositionError(
      CompositionDiagnosticCode.InvalidDocument,
      diagnosticPath(error),
      error.message || "Composition schema validation failed."
    );
  });
}

function diagnosticPath(error: JsonError): string {
  const pointer = error.data.pointer.slice(1);
  const path = isAdditionalProperty(error) ? parentPointer(pointer) : pointer;
  return path || "/";
}

function isAdditionalProperty(error: JsonError): boolean {
  return error.code === "no-additional-properties-error";
}

function parentPointer(pointer: string): string {
  const segments = pointer.split("/");
  segments.pop();
  return segments.join("/");
}
