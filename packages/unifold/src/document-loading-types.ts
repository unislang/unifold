import type {
  JsonObject,
  SignedUiDocumentEnvelope,
  UiDocumentSignatureAlgorithm
} from "@unislang/unifold-contracts";

import { UnifoldApplicationMountStatus } from "./types.js";
import type {
  PreparedUnifoldDocument,
  UnifoldApplicationDiagnostic,
  UnifoldApplicationPort,
  UnifoldPreparationOptions
} from "./types.js";

export enum UnifoldDocumentTrustRequirement {
  AllowUnsigned = "allow-unsigned",
  RequireSignature = "require-signature"
}

export enum UnifoldDocumentIntegrity {
  Unsigned = "unsigned",
  VerifiedSignature = "verified-signature"
}

export enum UnifoldDocumentKeyStatus {
  Active = "active",
  Revoked = "revoked"
}

export enum UnifoldDocumentLoadAuditOutcome {
  Loaded = "loaded",
  Rejected = "rejected"
}

export enum UnifoldDocumentSourceKind {
  SignedEnvelope = "signed-envelope",
  UnsignedJson = "unsigned-json",
  Unknown = "unknown"
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
  AuditFailed = "document-audit-failed",
  EnvelopeInvalid = "document-envelope-invalid",
  JsonInvalid = "document-json-invalid",
  KeyRevoked = "document-key-revoked",
  KeyResolutionFailed = "document-key-resolution-failed",
  MigrationBudgetExceeded = "document-migration-budget-exceeded",
  MigrationCycle = "document-migration-cycle",
  MigrationDuplicate = "document-migration-duplicate",
  MigrationFailed = "document-migration-failed",
  MigrationInvalidOutput = "document-migration-invalid-output",
  MigrationMissing = "document-migration-missing",
  PayloadTooLarge = "document-payload-too-large",
  SignatureInvalid = "document-signature-invalid",
  SignatureRequired = "document-signature-required",
  TrustMetadataInvalid = "document-trust-metadata-invalid"
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

export interface UnifoldDocumentTrustRecord {
  readonly issuer: string;
  readonly key: CryptoKey;
  readonly status: UnifoldDocumentKeyStatus;
}

export interface UnifoldDocumentTrustResolver {
  resolve(
    keyId: string,
    algorithm: UiDocumentSignatureAlgorithm
  ): Promise<UnifoldDocumentTrustRecord | undefined>;
}

export interface UnifoldDocumentLoadAuditRecord extends JsonObject {
  readonly diagnosticCode?: string;
  readonly integrity?: UnifoldDocumentIntegrity;
  readonly issuer?: string;
  readonly keyId?: string;
  readonly migrationCount: number;
  readonly outcome: UnifoldDocumentLoadAuditOutcome;
  readonly payloadSha256?: string;
  readonly sourceKind: UnifoldDocumentSourceKind;
}

export interface UnifoldDocumentLoadAuditReceipt extends JsonObject {
  readonly recordId: string;
  readonly recordedAt: string;
}

export interface UnifoldDocumentLoadAuditPort {
  record(entry: UnifoldDocumentLoadAuditRecord): Promise<UnifoldDocumentLoadAuditReceipt>;
}

export interface UnifoldDocumentProvenancePolicy {
  readonly audit: UnifoldDocumentLoadAuditPort;
  readonly trustResolver: UnifoldDocumentTrustResolver;
}

export interface LoadUnifoldDocumentOptions extends UnifoldPreparationOptions {
  readonly keyResolver?: UnifoldDocumentKeyResolver;
  readonly maxPayloadBytes?: number;
  readonly migrations?: readonly UnifoldDocumentMigration[];
  readonly provenancePolicy?: UnifoldDocumentProvenancePolicy;
  readonly trustRequirement: UnifoldDocumentTrustRequirement;
}

export interface UnifoldDocumentProvenanceAudit extends JsonObject {
  readonly recordId: string;
  readonly recordedAt: string;
}

export interface UnifoldDocumentProvenance extends JsonObject {
  readonly appliedMigrations: readonly UnifoldDocumentMigrationRecord[];
  readonly audit?: UnifoldDocumentProvenanceAudit;
  readonly integrity: UnifoldDocumentIntegrity;
  readonly originalSchemaVersion: string;
  readonly payloadSha256: string;
  readonly verifiedIssuer?: string;
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
