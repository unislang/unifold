import type { JsonObject } from "@unislang/unifold-contracts";

export enum EncryptedRecoveryStatus {
  Cancelled = "cancelled",
  Failed = "failed",
  Succeeded = "succeeded"
}

export enum EncryptedRecoveryErrorCode {
  BackupNotFound = "backup-not-found",
  Cancelled = "cancelled",
  CheckpointUnavailable = "checkpoint-unavailable",
  DecryptionFailed = "decryption-failed",
  EncryptionFailed = "encryption-failed",
  IntegrityFailed = "integrity-failed",
  InvalidEnvelope = "invalid-envelope",
  KeyUnavailable = "key-unavailable",
  RestoreVerificationFailed = "restore-verification-failed",
  SnapshotInvalid = "snapshot-invalid",
  SnapshotUnavailable = "snapshot-unavailable",
  VaultUnavailable = "vault-unavailable"
}

export interface EncryptedBackupEnvelope extends JsonObject {
  readonly algorithm: "AES-256-GCM";
  readonly backupId: string;
  readonly ciphertext: string;
  readonly createdAt: string;
  readonly keyId: string;
  readonly nonce: string;
  readonly plaintextSha256: string;
  readonly tenantId: string;
  readonly version: 1;
}

export interface EncryptedBackupReceipt extends JsonObject {
  readonly backupId: string;
  readonly createdAt: string;
  readonly keyId: string;
  readonly plaintextSha256: string;
  readonly tenantId: string;
}

export interface EncryptedRestoreDrillReceipt extends JsonObject {
  readonly backupId: string;
  readonly drilledAt: string;
  readonly keyId: string;
  readonly plaintextSha256: string;
  readonly tenantId: string;
}

export interface EncryptedRecoveryFailure extends JsonObject {
  readonly code: EncryptedRecoveryErrorCode;
  readonly messageKey: string;
}

export interface EncryptedRecoveryResult<TValue> {
  readonly error?: EncryptedRecoveryFailure;
  readonly status: EncryptedRecoveryStatus;
  readonly value?: TValue;
}

export interface ControlPlaneExternalBackupVaultPort {
  read(
    tenantId: string,
    backupId: string,
    signal?: AbortSignal
  ): Promise<EncryptedBackupEnvelope | undefined>;
  write(envelope: EncryptedBackupEnvelope, signal?: AbortSignal): Promise<void>;
}

export interface ControlPlaneBackupKeyPort {
  activeKey(tenantId: string, signal?: AbortSignal): Promise<ControlPlaneBackupKey | undefined>;
  resolveKey(tenantId: string, keyId: string, signal?: AbortSignal): Promise<CryptoKey | undefined>;
}

export interface ControlPlaneBackupKey {
  readonly key: CryptoKey;
  readonly keyId: string;
}

export interface ControlPlaneRestoreVerificationPort {
  exportTenant(tenantId: string, signal?: AbortSignal): Promise<JsonObject>;
  verifyRestore(tenantId: string, snapshot: JsonObject, signal?: AbortSignal): Promise<void>;
}

export interface ControlPlaneRestoreCheckpointPort {
  recordLastKnownGood(receipt: EncryptedRestoreDrillReceipt): Promise<void>;
}

export interface EncryptedControlPlaneRecoveryOptions {
  readonly checkpoint: ControlPlaneRestoreCheckpointPort;
  readonly crypto?: SubtleCrypto;
  readonly keys: ControlPlaneBackupKeyPort;
  readonly maximumSnapshotBytes?: number;
  readonly nonce?: () => Uint8Array;
  readonly source: ControlPlaneRestoreVerificationPort;
  readonly vault: ControlPlaneExternalBackupVaultPort;
}

export interface EncryptedBackupCommand {
  readonly backupId: string;
  readonly createdAt: string;
  readonly signal?: AbortSignal;
  readonly tenantId: string;
}

export interface EncryptedRestoreDrillCommand {
  readonly backupId: string;
  readonly drilledAt: string;
  readonly signal?: AbortSignal;
  readonly tenantId: string;
}
