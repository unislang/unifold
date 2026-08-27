import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";
import type {
  CompositionDefinition,
  TrustedLayoutDefinitionRegistry
} from "@unislang/unifold-compositions";

export enum UiModuleSchemaUri {
  Version1 = "https://schemas.unifold.org/ui-module/1.0/schema.json"
}

export enum UiModuleSchemaVersion {
  Version1 = "1.0.0"
}

export enum UiModuleLockSchemaUri {
  Version1 = "https://schemas.unifold.org/ui-module-lock/1.0/schema.json"
}

export enum UiModuleLockSchemaVersion {
  Version1 = "1.0.0"
}

export enum UiModuleResourceKind {
  Machine = "machine",
  Message = "message",
  Rule = "rule",
  Scenario = "scenario",
  Schema = "schema",
  Semantics = "semantics",
  Token = "token"
}

export enum UiModuleDiagnosticCode {
  CompositionInvalid = "composition-invalid",
  Cycle = "cycle",
  DuplicateModule = "duplicate-module",
  DuplicateNamespace = "duplicate-namespace",
  DuplicateResource = "duplicate-resource",
  ExportNotFound = "export-not-found",
  GraphLimitExceeded = "graph-limit-exceeded",
  ImportIntegrityMismatch = "import-integrity-mismatch",
  ImportNotFound = "import-not-found",
  InvalidLock = "invalid-lock",
  InvalidModule = "invalid-module",
  InvalidNamespaceReference = "invalid-namespace-reference",
  ModuleLimitExceeded = "module-limit-exceeded",
  ModuleNotFound = "module-not-found",
  ResourceLimitExceeded = "resource-limit-exceeded",
  UnsafeValue = "unsafe-value"
}

export enum UiModuleRegistryStatus {
  Ready = "ready",
  Rejected = "rejected"
}

export enum UiModuleResolutionStatus {
  Rejected = "rejected",
  Resolved = "resolved"
}

export interface UiModuleImport extends JsonObject {
  readonly integrity: string;
  readonly moduleId: string;
  readonly namespace: string;
  readonly version: string;
}

export interface UiModuleDocumentExport extends JsonObject {
  readonly document: JsonObject;
  readonly name: string;
}

export interface UiModuleResourceExport extends JsonObject {
  readonly id: string;
  readonly kind: UiModuleResourceKind;
  readonly value: JsonValue;
}

export interface UiModuleExports extends JsonObject {
  readonly compositions: readonly CompositionDefinition[];
  readonly documents: readonly UiModuleDocumentExport[];
  readonly resources: readonly UiModuleResourceExport[];
}

export interface UiModule extends JsonObject {
  readonly $schema: UiModuleSchemaUri;
  readonly exports: UiModuleExports;
  readonly id: string;
  readonly imports: readonly UiModuleImport[];
  readonly schemaVersion: UiModuleSchemaVersion;
  readonly version: string;
}

export interface UiModuleSource {
  readonly module: unknown;
  readonly sourceId: string;
}

export interface UiModuleDiagnostic {
  readonly code: UiModuleDiagnosticCode;
  readonly message: string;
  readonly path: string;
  readonly sourceId?: string;
}

export interface UiModuleSourceLocation extends JsonObject {
  readonly moduleId: string;
  readonly pointer: string;
  readonly sourceId: string;
  readonly version: string;
}

export interface UiResolvedModuleGraphEntry extends JsonObject {
  readonly integrity: string;
  readonly moduleId: string;
  readonly namespace: string;
  readonly sourceId: string;
  readonly version: string;
}

export interface UiResolvedModuleResource extends JsonObject {
  readonly id: string;
  readonly kind: UiModuleResourceKind;
  readonly value: JsonValue;
}

export interface UiResolvedModuleArtifact {
  readonly composedDocument: JsonObject;
  readonly document: JsonObject;
  readonly graph: readonly UiResolvedModuleGraphEntry[];
  readonly integrity: string;
  readonly resources: Readonly<Record<string, UiResolvedModuleResource>>;
  readonly sourceMap: Readonly<Record<string, UiModuleSourceLocation>>;
}

export interface UiModuleLockEntry extends JsonObject {
  readonly exportName: string;
  readonly moduleId: string;
  readonly version: string;
}

export interface UiModuleLock extends JsonObject {
  readonly $schema: UiModuleLockSchemaUri;
  readonly artifactIntegrity: string;
  readonly entry: UiModuleLockEntry;
  readonly irIntegrity: string;
  readonly modules: readonly UiResolvedModuleGraphEntry[];
  readonly schemaVersion: UiModuleLockSchemaVersion;
}

export interface ResolveUiModuleOptions {
  readonly exportName: string;
  readonly layoutRegistry?: TrustedLayoutDefinitionRegistry;
  readonly moduleId: string;
  readonly version: string;
}

export interface RegisteredUiModule {
  readonly integrity: string;
  readonly module: UiModule;
  readonly sourceId: string;
}

export type UiModuleRegistryResult =
  | {
      readonly diagnostics: readonly [];
      readonly registry: UiModuleRegistry;
      readonly status: UiModuleRegistryStatus.Ready;
    }
  | {
      readonly diagnostics: readonly UiModuleDiagnostic[];
      readonly status: UiModuleRegistryStatus.Rejected;
    };

export type UiModuleResolutionResult =
  | {
      readonly artifact: UiResolvedModuleArtifact;
      readonly diagnostics: readonly [];
      readonly status: UiModuleResolutionStatus.Resolved;
    }
  | {
      readonly diagnostics: readonly UiModuleDiagnostic[];
      readonly status: UiModuleResolutionStatus.Rejected;
    };

export interface UiModuleRegistry {
  readonly modules: ReadonlyMap<string, RegisteredUiModule>;
}
