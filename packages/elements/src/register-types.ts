import type { CoreElementTag } from "@unislang/unifold-catalog";

import type { ElementRegistrationDiagnosticCode, ElementRegistrationStatus } from "./enums.js";

export interface ElementCatalogIdentity {
  readonly catalogMajor: string;
  readonly catalogName: string;
  readonly catalogVersion: string;
}

export interface ElementDefinitionMetadata extends ElementCatalogIdentity {
  readonly tagName: CoreElementTag;
}

export interface ElementRegistrationDiagnostic {
  readonly code: ElementRegistrationDiagnosticCode;
  readonly expected?: ElementDefinitionMetadata;
  readonly found?: ElementDefinitionMetadata;
  readonly message: string;
  readonly tagName?: CoreElementTag;
}

export interface RegisteredElementsResult {
  readonly catalog: ElementCatalogIdentity;
  readonly definedTags: readonly CoreElementTag[];
  readonly diagnostics: readonly [];
  readonly status: ElementRegistrationStatus.Registered;
}

export interface RejectedElementsResult {
  readonly definedTags: readonly CoreElementTag[];
  readonly diagnostics: readonly ElementRegistrationDiagnostic[];
  readonly status: ElementRegistrationStatus.Rejected;
}

export type ElementRegistrationResult = RegisteredElementsResult | RejectedElementsResult;

export interface ElementRegistryPort {
  define(name: string, constructor: CustomElementConstructor): void;
  get(name: string): CustomElementConstructor | undefined;
  getName?(constructor: CustomElementConstructor): string | null;
}
