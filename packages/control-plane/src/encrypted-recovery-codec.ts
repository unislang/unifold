import type { JsonObject } from "@unislang/unifold-contracts";

import type {
  EncryptedBackupCommand,
  EncryptedBackupEnvelope,
  EncryptedBackupReceipt,
  EncryptedRestoreDrillCommand,
  EncryptedRestoreDrillReceipt
} from "./encrypted-recovery-types.js";

const defaultMaximumSnapshotBytes = 16 * 1024 * 1024;

export function backupMetadata(command: EncryptedBackupCommand, keyId: string, digest: string) {
  return {
    algorithm: "AES-256-GCM" as const,
    backupId: command.backupId,
    createdAt: command.createdAt,
    keyId,
    plaintextSha256: digest,
    tenantId: command.tenantId,
    version: 1 as const
  };
}

export function envelopeMetadata(envelope: EncryptedBackupEnvelope) {
  return {
    algorithm: envelope.algorithm,
    backupId: envelope.backupId,
    createdAt: envelope.createdAt,
    keyId: envelope.keyId,
    tenantId: envelope.tenantId,
    version: envelope.version
  };
}

export function backupAuthenticationMetadata(
  metadata: ReturnType<typeof backupMetadata>
): JsonObject {
  return {
    algorithm: metadata.algorithm,
    backupId: metadata.backupId,
    createdAt: metadata.createdAt,
    keyId: metadata.keyId,
    tenantId: metadata.tenantId,
    version: metadata.version
  };
}

export function backupReceipt(envelope: EncryptedBackupEnvelope): EncryptedBackupReceipt {
  const { backupId, createdAt, keyId, plaintextSha256, tenantId } = envelope;
  return { backupId, createdAt, keyId, plaintextSha256, tenantId };
}

export function drillReceipt(
  command: EncryptedRestoreDrillCommand,
  envelope: EncryptedBackupEnvelope
): EncryptedRestoreDrillReceipt {
  return {
    backupId: command.backupId,
    drilledAt: command.drilledAt,
    keyId: envelope.keyId,
    plaintextSha256: envelope.plaintextSha256,
    tenantId: command.tenantId
  };
}

export function validRecoveryIdentity(value: string): boolean {
  return [value.length > 0, value.length <= 1024, [...value].every(visibleCharacter)].every(
    Boolean
  );
}

function visibleCharacter(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  return code > 31 && code !== 127;
}

export function validEncryptedEnvelope(
  envelope: EncryptedBackupEnvelope,
  command: EncryptedRestoreDrillCommand
): boolean {
  return [
    envelope.version === 1,
    envelope.algorithm === "AES-256-GCM",
    envelope.tenantId === command.tenantId,
    envelope.backupId === command.backupId,
    validCanonicalUtc(envelope.createdAt),
    validRecoveryIdentity(envelope.keyId),
    /^[A-Za-z0-9_-]{43}$/u.test(envelope.plaintextSha256),
    /^[A-Za-z0-9_-]{16}$/u.test(envelope.nonce),
    envelope.ciphertext.length > 0,
    envelope.ciphertext.length <= 32 * 1024 * 1024
  ].every(Boolean);
}

export function validCanonicalUtc(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export function decodeRecoverySnapshot(bytes: Uint8Array, maximumBytes: number): JsonObject {
  if (bytes.length > maximumBytes) throw new TypeError("Recovery snapshot exceeds its limit.");
  const value = parseRecoveryJson(bytes);
  if (!isJsonObject(value)) throw new TypeError("Recovery snapshot must be a JSON object.");
  return value as JsonObject;
}

function parseRecoveryJson(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
}

function isJsonObject(value: unknown): value is JsonObject {
  return [typeof value === "object", value !== null, !Array.isArray(value)].every(Boolean);
}

export async function recoverySha256(subtle: SubtleCrypto, bytes: Uint8Array): Promise<string> {
  const owned = Uint8Array.from(bytes);
  return base64Url(new Uint8Array(await subtle.digest("SHA-256", owned.buffer)));
}

export function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new TypeError("Invalid base64url value.");
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function configuredRecoveryMaximum(value: number | undefined): number {
  const maximum = value ?? defaultMaximumSnapshotBytes;
  const invalid = [!Number.isSafeInteger(maximum), maximum < 1024, maximum > 64 * 1024 * 1024];
  if (invalid.some(Boolean)) {
    throw new RangeError("Encrypted recovery snapshot limit is invalid.");
  }
  return maximum;
}

export function randomRecoveryNonce(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(12));
}

export function ownedBytes(value: Uint8Array): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(value);
}
