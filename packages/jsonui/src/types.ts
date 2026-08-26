import type {
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision
} from "@unislang/unifold-contracts";

import type {
  JsonUiCompatibilityExpectation,
  JsonUiCorpusOrigin,
  JsonUiFeature,
  JsonUiFeatureDisposition,
  JsonUiFixtureLicense,
  JsonUiProfileDiagnosticCode,
  JsonUiUpstreamPackageVersion
} from "./enums.js";

export interface JsonUiCompatibilityCase {
  readonly expectation: JsonUiCompatibilityExpectation;
  readonly expectedDiagnostics: readonly JsonUiCompatibilityDiagnosticExpectation[];
  readonly feature: JsonUiFeature;
  readonly id: string;
  readonly provenance: JsonUiCorpusProvenance;
  readonly view: unknown;
}

export interface JsonUiCompatibilityDiagnosticExpectation {
  readonly code: JsonUiProfileDiagnosticCode;
  readonly feature: JsonUiFeature;
  readonly path: string;
}

export interface JsonUiCorpusProvenance {
  readonly license: JsonUiFixtureLicense;
  readonly origin: JsonUiCorpusOrigin;
  readonly revision: JsonUiUpstreamRevision;
  readonly source: string;
  readonly transformation: string;
}

export interface JsonUiProfileDescriptor {
  readonly features: Readonly<Record<JsonUiFeature, JsonUiFeatureDisposition>>;
  readonly name: JsonUiProfileName;
  readonly upstreamPackageVersion: JsonUiUpstreamPackageVersion;
  readonly upstreamRevision: JsonUiUpstreamRevision;
  readonly version: JsonUiProfileVersion;
}

export interface JsonUiProfileDiagnostic {
  readonly code: JsonUiProfileDiagnosticCode;
  readonly feature?: JsonUiFeature;
  readonly message: string;
  readonly path: string;
}

export interface JsonUiProfileValidationResult {
  readonly compatible: boolean;
  readonly diagnostics: readonly JsonUiProfileDiagnostic[];
}
