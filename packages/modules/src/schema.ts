import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";

import schema from "./ui-module.schema.json" with { type: "json" };
import { UiModuleDiagnosticCode, type UiModule, type UiModuleDiagnostic } from "./types.js";

const validator = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true
}).compile<UiModule>(schema);

export function validateUiModule(
  value: unknown,
  sourceId?: string
): {
  readonly diagnostics: readonly UiModuleDiagnostic[];
  readonly module?: UiModule;
} {
  if (validator(value)) return { diagnostics: [], module: value };
  return { diagnostics: schemaDiagnostics(validator.errors, sourceId) };
}

function schemaDiagnostics(
  errors: readonly ErrorObject[] | null | undefined,
  sourceId: string | undefined
): UiModuleDiagnostic[] {
  return (errors ?? []).map((error) => schemaDiagnostic(error, sourceId));
}

function schemaDiagnostic(error: ErrorObject, sourceId: string | undefined): UiModuleDiagnostic {
  const diagnostic = schemaErrorDiagnostic(error);
  return sourceId === undefined ? diagnostic : { ...diagnostic, sourceId };
}

function schemaErrorDiagnostic(error: ErrorObject): UiModuleDiagnostic {
  return {
    code: UiModuleDiagnosticCode.InvalidModule,
    message: error.message ?? "UiModule schema validation failed.",
    path: error.instancePath || "/"
  };
}
