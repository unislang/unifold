import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";

import type { ResolveUiModuleOptions } from "@unislang/unifold-modules";

import {
  UnifoldCliDiagnosticCode,
  UnifoldCliModuleProjectSchemaUri,
  UnifoldCliModuleProjectSchemaVersion
} from "./enums.js";
import type { UnifoldCliDiagnostic } from "./types.js";
import schema from "./ui-module-project.schema.json" with { type: "json" };

export const UI_MODULE_PROJECT_SCHEMA = UnifoldCliModuleProjectSchemaUri.Version1;

export interface UiModuleProjectManifest {
  readonly $schema: UnifoldCliModuleProjectSchemaUri.Version1;
  readonly entry: ResolveUiModuleOptions;
  readonly schemaVersion: UnifoldCliModuleProjectSchemaVersion.Version1;
  readonly sources: readonly string[];
}

export interface ValidateUiModuleProjectManifestResult {
  readonly diagnostics: readonly UnifoldCliDiagnostic[];
  readonly manifest?: UiModuleProjectManifest;
}

const validator = new Ajv2020({ allErrors: true, strict: true }).compile<UiModuleProjectManifest>(
  schema
);

export function validateUiModuleProjectManifest(
  value: unknown
): ValidateUiModuleProjectManifestResult {
  if (validator(value)) return { diagnostics: [], manifest: value };
  return { diagnostics: (validator.errors ?? []).map(projectDiagnostic) };
}

function projectDiagnostic(error: ErrorObject): UnifoldCliDiagnostic {
  return {
    code: UnifoldCliDiagnosticCode.ModuleManifestInvalid,
    message: error.message ?? "UiModule project schema validation failed.",
    path: error.instancePath || "/"
  };
}
