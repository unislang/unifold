import {
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision
} from "@unislang/unifold-contracts";

import { addProfileDiagnostic, asJsonRecord, escapeJsonPointer } from "./diagnostic-helpers.js";
import { JsonUiProfileDiagnosticCode } from "./enums.js";
import { scanJsonUiView } from "./traversal.js";
import type { JsonUiProfileDiagnostic, JsonUiProfileValidationResult } from "./types.js";

const PROFILE_KEYS = new Set(["name", "upstream", "version"]);

export function validateJsonUiProfileDocument(value: unknown): JsonUiProfileValidationResult {
  const diagnostics: JsonUiProfileDiagnostic[] = [];
  const document = asJsonRecord(value);
  validateProfile(documentValue(document, "jsonUiProfile"), diagnostics);
  scanJsonUiView(
    documentValue(document, "view"),
    diagnostics,
    declaredStoreIds(documentValue(document, "stores"))
  );
  return validationResult(diagnostics);
}

function documentValue(
  document: Readonly<Record<string, unknown>> | undefined,
  key: string
): unknown {
  return document === undefined ? undefined : document[key];
}

function validationResult(
  diagnostics: readonly JsonUiProfileDiagnostic[]
): JsonUiProfileValidationResult {
  return { compatible: diagnostics.length === 0, diagnostics };
}

function declaredStoreIds(value: unknown): ReadonlySet<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(
    value
      .map(asJsonRecord)
      .map((store) => store?.["id"])
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  );
}

function validateProfile(value: unknown, diagnostics: JsonUiProfileDiagnostic[]): void {
  const profile = asJsonRecord(value);
  if (profile === undefined) return addInvalidProfileShape(diagnostics);
  validateProfileValue(profile["name"], JsonUiProfileName.Unifold, "name", diagnostics);
  validateProfileValue(profile["version"], JsonUiProfileVersion.Version1, "version", diagnostics);
  validateProfileValue(
    profile["upstream"],
    JsonUiUpstreamRevision.Version01025,
    "upstream",
    diagnostics
  );
  Object.keys(profile).forEach((key) => validateProfileKey(key, diagnostics));
}

function validateProfileValue(
  actual: unknown,
  expected: string,
  key: string,
  diagnostics: JsonUiProfileDiagnostic[]
): void {
  if (actual === expected) return;
  addProfileDiagnostic(
    {
      code: profileCode(key),
      message: `Expected the pinned JsonUI profile ${key} "${expected}".`,
      path: `/jsonUiProfile/${key}`
    },
    diagnostics
  );
}

function profileCode(key: string): JsonUiProfileDiagnosticCode {
  const codes: Readonly<Record<string, JsonUiProfileDiagnosticCode>> = {
    name: JsonUiProfileDiagnosticCode.InvalidName,
    upstream: JsonUiProfileDiagnosticCode.InvalidUpstreamRevision,
    version: JsonUiProfileDiagnosticCode.InvalidVersion
  };
  return codes[key] ?? JsonUiProfileDiagnosticCode.InvalidProfileShape;
}

function validateProfileKey(key: string, diagnostics: JsonUiProfileDiagnostic[]): void {
  if (PROFILE_KEYS.has(key)) return;
  addProfileDiagnostic(
    {
      code: JsonUiProfileDiagnosticCode.UnknownProfileProperty,
      message: `JsonUI profile property "${key}" is not supported.`,
      path: `/jsonUiProfile/${escapeJsonPointer(key)}`
    },
    diagnostics
  );
}

function addInvalidProfileShape(diagnostics: JsonUiProfileDiagnostic[]): void {
  addProfileDiagnostic(
    {
      code: JsonUiProfileDiagnosticCode.InvalidProfileShape,
      message:
        "jsonUiProfile must be an object with a pinned name, version, and upstream revision.",
      path: "/jsonUiProfile"
    },
    diagnostics
  );
}
