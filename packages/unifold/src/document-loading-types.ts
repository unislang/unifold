import type {
  JsonObject,
  SignedUiDocumentEnvelope,
  UiDocumentSignatureAlgorithm
} from "@unislang/unifold-contracts";

import { UnifoldApplicationMountStatus } from "./types.js";
import type {
  PreparedUnifoldDocument,
  UnifoldApplicationDiagnostic,
  UnifoldApplicationPort
} from "./types.js";

export enum UnifoldDocumentTrustRequirement {
  AllowUnsigned = "allow-unsigned",
  RequireSignature = "require-signature"
}

export enum UnifoldDocumentIntegrity {
  Unsigned = "unsigned",
  VerifiedSignature = "verified-signature"
}

export enum UnifoldDocumentLoadStatus {
  Loaded = "loaded",
  Rejected = "rejected"
}

export enum UnifoldDocumentMigrationStatus {
  Migrated = "migrated",
  Rejected = "rejected"
}

export enum UnifoldDocumentLoadLimit {
  MaxMigrationSteps = 16,
  MaxPayloadBytes = 1_000_000
}

export enum UnifoldDocumentLoadDiagnosticCode {
  EnvelopeInvalid = "document-envelope-invalid",
  JsonInvalid = "document-json-invalid",
  KeyResolutionFailed = "document-key-resolution-failed",
  MigrationBudgetExceeded = "document-migration-budget-exceeded",
  MigrationCycle = "document-migration-cycle",
  MigrationDuplicate = "document-migration-duplicate",
  MigrationFailed = "document-migration-failed",
  MigrationInvalidOutput = "document-migration-invalid-output",
  MigrationMissing = "document-migration-missing",
  PayloadTooLarge = "document-payload-too-large",
  SignatureInvalid = "document-signature-invalid",
  SignatureRequired = "document-signature-required"
}

export interface UnifoldDocumentMigration {
  readonly fromVersion: string;
  readonly migrate: (document: JsonObject) => JsonObject;
  readonly toVersion: string;
}

export interface UnifoldDocumentMigrationRecord extends JsonObject {
  readonly fromVersion: string;
  readonly toVersion: string;
}

export interface UnifoldDocumentKeyResolver {
  resolve(keyId: string, algorithm: UiDocumentSignatureAlgorithm): Promise<CryptoKey | undefined>;
}

export interface LoadUnifoldDocumentOptions {
  readonly keyResolver?: UnifoldDocumentKeyResolver;
  readonly maxPayloadBytes?: number;
  readonly migrations?: readonly UnifoldDocumentMigration[];
  readonly trustRequirement: UnifoldDocumentTrustRequirement;
}

export interface UnifoldDocumentProvenance extends JsonObject {
  readonly appliedMigrations: readonly UnifoldDocumentMigrationRecord[];
  readonly integrity: UnifoldDocumentIntegrity;
  readonly originalSchemaVersion: string;
  readonly verifiedKeyId?: string;
}

export interface LoadedUnifoldDocumentResult {
  readonly diagnostics: readonly UnifoldApplicationDiagnostic[];
  readonly prepared: PreparedUnifoldDocument;
  readonly provenance: UnifoldDocumentProvenance;
  readonly status: UnifoldDocumentLoadStatus.Loaded;
}

export interface RejectedUnifoldDocumentResult {
  readonly diagnostics: readonly UnifoldApplicationDiagnostic[];
  readonly status: UnifoldDocumentLoadStatus.Rejected;
}

export type LoadUnifoldDocumentResult = LoadedUnifoldDocumentResult | RejectedUnifoldDocumentResult;

export interface LoadedMountedUnifoldApplicationResult {
  readonly application: UnifoldApplicationPort;
  readonly diagnostics: readonly UnifoldApplicationDiagnostic[];
  readonly provenance: UnifoldDocumentProvenance;
  readonly status: UnifoldApplicationMountStatus.Mounted;
}

export interface LoadedRejectedUnifoldApplicationResult {
  readonly diagnostics: readonly UnifoldApplicationDiagnostic[];
  readonly provenance?: UnifoldDocumentProvenance;
  readonly status: UnifoldApplicationMountStatus.Rejected;
}

export type LoadAndMountUnifoldApplicationResult =
  | LoadedMountedUnifoldApplicationResult
  | LoadedRejectedUnifoldApplicationResult;

export interface MigratedUnifoldDocumentResult {
  readonly appliedMigrations: readonly UnifoldDocumentMigrationRecord[];
  readonly document: JsonObject;
  readonly originalSchemaVersion: string;
  readonly status: UnifoldDocumentMigrationStatus.Migrated;
}

export interface RejectedUnifoldDocumentMigrationResult {
  readonly diagnostic: UnifoldApplicationDiagnostic;
  readonly status: UnifoldDocumentMigrationStatus.Rejected;
}

export type UnifoldDocumentMigrationResult =
  | MigratedUnifoldDocumentResult
  | RejectedUnifoldDocumentMigrationResult;

export type UnifoldDocumentSource = string | SignedUiDocumentEnvelope;
