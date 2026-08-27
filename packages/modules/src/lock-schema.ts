import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";

import schema from "./ui-module-lock.schema.json" with { type: "json" };
import { UiModuleDiagnosticCode, type UiModuleDiagnostic, type UiModuleLock } from "./types.js";

const validator = new Ajv2020({ allErrors: true, strict: true }).compile<UiModuleLock>(schema);

export function validateUiModuleLock(value: unknown): {
  readonly diagnostics: readonly UiModuleDiagnostic[];
  readonly lock?: UiModuleLock;
} {
  if (validator(value)) return { diagnostics: [], lock: value };
  return { diagnostics: (validator.errors ?? []).map(lockDiagnostic) };
}

function lockDiagnostic(error: ErrorObject): UiModuleDiagnostic {
  return {
    code: UiModuleDiagnosticCode.InvalidLock,
    message: error.message ?? "UiModule lock schema validation failed.",
    path: error.instancePath || "/"
  };
}
