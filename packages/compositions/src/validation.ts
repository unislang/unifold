import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";

import schema from "./composed-ui-document.schema.json" with { type: "json" };
import { CompositionDiagnosticCode } from "./enums.js";
import { compositionError } from "./diagnostics.js";
import type { ComposedUiDocument, CompositionDiagnostic } from "./types.js";

const validator = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true
}).compile<ComposedUiDocument>(schema);

export function validateComposedDocument(value: unknown): {
  readonly diagnostics: readonly CompositionDiagnostic[];
  readonly document?: ComposedUiDocument;
} {
  if (validator(value)) return { diagnostics: [], document: value };
  return { diagnostics: schemaDiagnostics(validator.errors) };
}

function schemaDiagnostics(
  errors: readonly ErrorObject[] | null | undefined
): CompositionDiagnostic[] {
  return (errors ?? []).map((error) => {
    const message = error.message ?? "Composition schema validation failed.";
    return compositionError(
      CompositionDiagnosticCode.InvalidDocument,
      error.instancePath || "/",
      message
    );
  });
}
