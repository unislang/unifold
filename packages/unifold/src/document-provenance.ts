import {
  UiDocumentSignatureAlgorithm,
  type UiDocumentSignature
} from "@unislang/unifold-contracts";

import {
  UnifoldDocumentKeyStatus,
  UnifoldDocumentLoadDiagnosticCode,
  type LoadUnifoldDocumentOptions,
  type UnifoldDocumentLoadAuditReceipt,
  type UnifoldDocumentLoadAuditRecord,
  type UnifoldDocumentProvenancePolicy,
  type UnifoldDocumentTrustRecord
} from "./document-loading-types.js";

interface VerifiedDocumentTrust {
  readonly issuer?: string;
  readonly key: CryptoKey;
}

export class DocumentProvenanceError extends Error {
  constructor(
    readonly code: UnifoldDocumentLoadDiagnosticCode,
    readonly path: string,
    message: string,
    readonly issuer?: string
  ) {
    super(message);
  }
}

export async function fingerprintDocumentPayload(payload: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload)
  );
  return [...new Uint8Array(digest)].map(hexByte).join("");
}

export async function resolveDocumentVerificationTrust(
  signature: UiDocumentSignature,
  options: LoadUnifoldDocumentOptions
): Promise<VerifiedDocumentTrust> {
  if (options.provenancePolicy !== undefined) {
    assertSingleResolver(options);
    return resolveTrustedRecord(signature, options.provenancePolicy);
  }
  return { key: await resolveLegacyKey(signature, options) };
}

export async function recordDocumentLoadAudit(
  policy: UnifoldDocumentProvenancePolicy | undefined,
  record: UnifoldDocumentLoadAuditRecord
): Promise<UnifoldDocumentLoadAuditReceipt | undefined> {
  if (policy === undefined) return undefined;
  return invokeDocumentLoadAudit(policy, record);
}

async function invokeDocumentLoadAudit(
  policy: UnifoldDocumentProvenancePolicy,
  record: UnifoldDocumentLoadAuditRecord
): Promise<UnifoldDocumentLoadAuditReceipt> {
  try {
    const receipt = await policy.audit.record(structuredClone(record));
    return requireAuditReceipt(receipt);
  } catch (error) {
    if (error instanceof DocumentProvenanceError) throw error;
    throw provenanceError(
      UnifoldDocumentLoadDiagnosticCode.AuditFailed,
      "/provenance/audit",
      "The document provenance audit could not be recorded."
    );
  }
}

async function resolveTrustedRecord(
  signature: UiDocumentSignature,
  policy: UnifoldDocumentProvenancePolicy
): Promise<VerifiedDocumentTrust> {
  const record = await fetchTrustedRecord(signature, policy);
  assertTrustRecord(record);
  assertActiveTrustRecord(record);
  return { issuer: record.issuer, key: record.key };
}

async function fetchTrustedRecord(
  signature: UiDocumentSignature,
  policy: UnifoldDocumentProvenancePolicy
): Promise<UnifoldDocumentTrustRecord> {
  let record: UnifoldDocumentTrustRecord | undefined;
  try {
    record = await policy.trustResolver.resolve(signature.keyId, signature.algorithm);
  } catch {
    return rejectUnknownKey(signature.keyId);
  }
  if (record === undefined) return rejectUnknownKey(signature.keyId);
  return record;
}

function assertActiveTrustRecord(record: UnifoldDocumentTrustRecord): void {
  if (record.status === UnifoldDocumentKeyStatus.Revoked) {
    throw provenanceError(
      UnifoldDocumentLoadDiagnosticCode.KeyRevoked,
      "/signature/keyId",
      "The document signing key is revoked.",
      record.issuer
    );
  }
}

async function resolveLegacyKey(
  signature: UiDocumentSignature,
  options: LoadUnifoldDocumentOptions
): Promise<CryptoKey> {
  const key = await fetchLegacyKey(signature, options);
  return key ?? rejectUnknownKey(signature.keyId);
}

async function fetchLegacyKey(
  signature: UiDocumentSignature,
  options: LoadUnifoldDocumentOptions
): Promise<CryptoKey | undefined> {
  try {
    return await options.keyResolver?.resolve(signature.keyId, signature.algorithm);
  } catch {
    return rejectUnknownKey(signature.keyId);
  }
}

function assertSingleResolver(options: LoadUnifoldDocumentOptions): void {
  if (options.keyResolver === undefined) return;
  throw provenanceError(
    UnifoldDocumentLoadDiagnosticCode.TrustMetadataInvalid,
    "/provenance",
    "Configure either a provenance policy or a legacy key resolver, not both."
  );
}

function assertTrustRecord(record: UnifoldDocumentTrustRecord): void {
  const valid = [
    validIssuer(record.issuer),
    validStatus(record.status),
    validVerificationKey(record.key)
  ].every(Boolean);
  if (valid) return;
  throw provenanceError(
    UnifoldDocumentLoadDiagnosticCode.TrustMetadataInvalid,
    "/provenance",
    "The trusted document key metadata is invalid."
  );
}

function validIssuer(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return [value.length > 0, value.length <= 512, [...value].every(printableCharacter)].every(
    Boolean
  );
}

function printableCharacter(value: string): boolean {
  const code = value.codePointAt(0) ?? 0;
  if (code === 127) return false;
  return code >= 32;
}

function validStatus(value: unknown): value is UnifoldDocumentKeyStatus {
  return Object.values(UnifoldDocumentKeyStatus).includes(value as UnifoldDocumentKeyStatus);
}

function validVerificationKey(value: unknown): value is CryptoKey {
  try {
    if (![typeof value === "object", value !== null].every(Boolean)) return false;
    const key = value as CryptoKey;
    return [
      key.type === "public",
      key.algorithm.name === UiDocumentSignatureAlgorithm.Ed25519,
      key.usages.includes("verify")
    ].every(Boolean);
  } catch {
    return false;
  }
}

function requireAuditReceipt(value: unknown): UnifoldDocumentLoadAuditReceipt {
  if (validAuditReceipt(value)) return value;
  throw provenanceError(
    UnifoldDocumentLoadDiagnosticCode.AuditFailed,
    "/provenance/audit",
    "The document provenance audit returned an invalid receipt."
  );
}

function validAuditReceipt(value: unknown): value is UnifoldDocumentLoadAuditReceipt {
  if (!isRecord(value) || !hasExactKeys(value, ["recordId", "recordedAt"])) return false;
  return [validIdentity(value["recordId"]), canonicalUtc(value["recordedAt"])].every(Boolean);
}

function validIdentity(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

function canonicalUtc(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function rejectUnknownKey(keyId: string): never {
  throw provenanceError(
    UnifoldDocumentLoadDiagnosticCode.KeyResolutionFailed,
    "/signature/keyId",
    `No trusted verification key is available for ${keyId}.`
  );
}

function provenanceError(
  code: UnifoldDocumentLoadDiagnosticCode,
  path: string,
  message: string,
  issuer?: string
): DocumentProvenanceError {
  return new DocumentProvenanceError(code, path, message, issuer);
}

function hexByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}
