import { compositionError } from "./diagnostics.js";
import { CompositionDiagnosticCode } from "./enums.js";
import { isLayoutObject } from "./layout-values.js";
import type { CompositionDiagnostic } from "./types.js";

const schemaUri = "https://schemas.unifold.org/layout-document/1.0/schema.json";
const allowedKeys = new Set([
  "$schema",
  "catalog",
  "compositionManifest",
  "controls",
  "id",
  "layoutType",
  "layoutVersion",
  "layouts",
  "machines",
  "revision",
  "rules",
  "schemaVersion",
  "semantics",
  "stores",
  "variables"
]);
const requiredKeys = [
  "$schema",
  "catalog",
  "id",
  "layoutType",
  "layoutVersion",
  "revision",
  "schemaVersion",
  "variables"
];

export function validateLayoutDocumentShape(value: unknown): readonly CompositionDiagnostic[] {
  if (!isLayoutObject(value)) return [diagnostic("/", "Layout must be an object.")];
  return [
    ...missingKeyDiagnostics(value),
    ...unknownKeyDiagnostics(value),
    ...schemaUriDiagnostics(value)
  ];
}

function missingKeyDiagnostics(value: Readonly<Record<string, unknown>>): CompositionDiagnostic[] {
  return requiredKeys
    .filter((key) => !Object.hasOwn(value, key))
    .map((key) => diagnostic("/", `Layout requires property '${key}'.`));
}

function unknownKeyDiagnostics(value: Readonly<Record<string, unknown>>): CompositionDiagnostic[] {
  return Object.keys(value)
    .filter((key) => !allowedKeys.has(key))
    .map((key) => diagnostic(`/${escapePointer(key)}`, `Unknown layout property '${key}'.`));
}

function schemaUriDiagnostics(value: Readonly<Record<string, unknown>>): CompositionDiagnostic[] {
  return value["$schema"] === schemaUri
    ? []
    : [diagnostic("/$schema", `Layout schema must be '${schemaUri}'.`)];
}

function diagnostic(path: string, message: string): CompositionDiagnostic {
  return compositionError(CompositionDiagnosticCode.InvalidLayout, path, message);
}

function escapePointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
