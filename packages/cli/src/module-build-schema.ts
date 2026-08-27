import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";

import type { UiResolvedModuleArtifact } from "@unislang/unifold-modules";

import {
  UnifoldCliDiagnosticCode,
  UnifoldCliModuleBuildSchemaUri,
  UnifoldCliModuleBuildSchemaVersion
} from "./enums.js";
import type { ResolvedUiModuleProject } from "./module-project.js";
import type { UnifoldCliDiagnostic } from "./types.js";
import schema from "./ui-module-build.schema.json" with { type: "json" };

export const UI_MODULE_BUILD_SCHEMA = UnifoldCliModuleBuildSchemaUri.Version2;

export interface UiModuleBuildArtifact {
  readonly $schema: UnifoldCliModuleBuildSchemaUri.Version2;
  readonly entry: ResolvedUiModuleProject["entry"];
  readonly irIntegrity: string;
  readonly resolvedArtifact: UiResolvedModuleArtifact;
  readonly schemaVersion: UnifoldCliModuleBuildSchemaVersion.Version2;
}

export interface ValidateUiModuleBuildArtifactResult {
  readonly artifact?: UiModuleBuildArtifact;
  readonly diagnostics: readonly UnifoldCliDiagnostic[];
}

const validator = new Ajv2020({ allErrors: true, strict: true }).compile<UiModuleBuildArtifact>(
  schema
);

export function validateUiModuleBuildArtifact(value: unknown): ValidateUiModuleBuildArtifactResult {
  if (validator(value)) return { artifact: value, diagnostics: [] };
  return { diagnostics: (validator.errors ?? []).map(buildDiagnostic) };
}

function buildDiagnostic(error: ErrorObject): UnifoldCliDiagnostic {
  return {
    code: UnifoldCliDiagnosticCode.ModuleBuildInvalid,
    message: error.message ?? "UiModule build schema validation failed.",
    path: error.instancePath || "/"
  };
}
