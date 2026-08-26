import {
  UiDocumentEnvelopeSchemaUri,
  UiDocumentEnvelopeVersion,
  UiDocumentSignatureAlgorithm,
  type JsonObject,
  type SignedUiDocumentEnvelope,
  type UiDocumentSignature
} from "@unislang/unifold-contracts";

import { prepareUnifoldDocument } from "./compiler.js";
import {
  UnifoldDocumentIntegrity,
  UnifoldDocumentLoadDiagnosticCode,
  UnifoldDocumentLoadLimit,
  UnifoldDocumentLoadStatus,
  UnifoldDocumentMigrationStatus,
  UnifoldDocumentTrustRequirement,
  type LoadedUnifoldDocumentResult,
  type LoadUnifoldDocumentOptions,
  type LoadUnifoldDocumentResult,
  type UnifoldDocumentKeyResolver,
  type UnifoldDocumentProvenance
} from "./document-loading-types.js";
import { migrateUnifoldDocument } from "./document-migration.js";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldPreparationStatus,
  type PreparedUnifoldDocument,
  type UnifoldApplicationDiagnostic
} from "./types.js";

interface ExtractedPayload {
  readonly payload: string;
  readonly signature?: UiDocumentSignature;
}

interface VerifiedIntegrity {
  readonly integrity: UnifoldDocumentIntegrity;
  readonly keyId?: string;
}

class DocumentLoadRejection extends Error {
  constructor(readonly diagnostics: readonly UnifoldApplicationDiagnostic[]) {
    super(diagnostics[0]?.message ?? "Document loading was rejected.");
  }
}

export async function loadUnifoldDocument(
  source: unknown,
  options: LoadUnifoldDocumentOptions
): Promise<LoadUnifoldDocumentResult> {
  try {
    return await loadVerifiedDocument(source, options);
  } catch (error) {
    const diagnostics =
      error instanceof DocumentLoadRejection
        ? error.diagnostics
        : [
            loadDiagnostic(UnifoldDocumentLoadDiagnosticCode.EnvelopeInvalid, "Invalid input.", "/")
          ];
    return { diagnostics, status: UnifoldDocumentLoadStatus.Rejected };
  }
}

async function loadVerifiedDocument(
  source: unknown,
  options: LoadUnifoldDocumentOptions
): Promise<LoadedUnifoldDocumentResult> {
  const extracted = extractPayload(source);
  assertPayloadSize(extracted.payload, options.maxPayloadBytes);
  const verified = await verifyIntegrity(extracted, options);
  const parsed = parsePayload(extracted.payload);
  const migration = migrateUnifoldDocument(parsed, options.migrations ?? []);
  const migrated = requireMigration(migration);
  const prepared = requirePreparation(prepareUnifoldDocument(migrated.document));
  return loaded(prepared, {
    appliedMigrations: migrated.appliedMigrations,
    integrity: verified.integrity,
    originalSchemaVersion: migrated.originalSchemaVersion,
    ...verifiedKey(verified.keyId)
  });
}

function extractPayload(source: unknown): ExtractedPayload {
  if (typeof source === "string") return { payload: source };
  const envelope = requireEnvelope(source);
  return { payload: envelope.payload, signature: envelope.signature };
}

async function verifyIntegrity(
  extracted: ExtractedPayload,
  options: LoadUnifoldDocumentOptions
): Promise<VerifiedIntegrity> {
  if (extracted.signature === undefined) return unsignedIntegrity(options.trustRequirement);
  const key = await resolveKey(extracted.signature, options.keyResolver);
  const valid = await verifyPayload(extracted.payload, extracted.signature.value, key);
  if (!valid)
    reject(UnifoldDocumentLoadDiagnosticCode.SignatureInvalid, "Invalid signature.", "/signature");
  return {
    integrity: UnifoldDocumentIntegrity.VerifiedSignature,
    keyId: extracted.signature.keyId
  };
}

function unsignedIntegrity(requirement: UnifoldDocumentTrustRequirement): VerifiedIntegrity {
  if (requirement === UnifoldDocumentTrustRequirement.RequireSignature) {
    reject(
      UnifoldDocumentLoadDiagnosticCode.SignatureRequired,
      "This document source requires a detached signature.",
      "/signature"
    );
  }
  return { integrity: UnifoldDocumentIntegrity.Unsigned };
}

async function resolveKey(
  signature: UiDocumentSignature,
  resolver: UnifoldDocumentKeyResolver | undefined
): Promise<CryptoKey> {
  if (resolver === undefined) return rejectKey(signature.keyId);
  return resolveKnownKey(signature, resolver);
}

async function resolveKnownKey(
  signature: UiDocumentSignature,
  resolver: UnifoldDocumentKeyResolver
): Promise<CryptoKey> {
  try {
    return requireKey(
      await resolver.resolve(signature.keyId, signature.algorithm),
      signature.keyId
    );
  } catch {
    return rejectKey(signature.keyId);
  }
}

function requireKey(key: CryptoKey | undefined, keyId: string): CryptoKey {
  return key ?? rejectKey(keyId);
}

async function verifyPayload(payload: string, encoded: string, key: CryptoKey): Promise<boolean> {
  const signature = decodeBase64Url(encoded);
  if (signature === undefined) return false;
  try {
    return await globalThis.crypto.subtle.verify(
      UiDocumentSignatureAlgorithm.Ed25519,
      key,
      signature,
      new TextEncoder().encode(payload)
    );
  } catch {
    return false;
  }
}

function parsePayload(payload: string): JsonObject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    reject(UnifoldDocumentLoadDiagnosticCode.JsonInvalid, "The document payload is not JSON.", "/");
  }
  if (!isRecord(parsed)) {
    reject(
      UnifoldDocumentLoadDiagnosticCode.JsonInvalid,
      "The document payload must be an object.",
      "/"
    );
  }
  return parsed as JsonObject;
}

function requireEnvelope(source: unknown): SignedUiDocumentEnvelope {
  if (!isRecord(source) || !hasEnvelopeShape(source)) {
    reject(UnifoldDocumentLoadDiagnosticCode.EnvelopeInvalid, "Invalid signed envelope.", "/");
  }
  return source as unknown as SignedUiDocumentEnvelope;
}

function hasEnvelopeShape(value: Record<string, unknown>): boolean {
  return [
    hasExactKeys(value, ["$schema", "envelopeVersion", "payload", "signature"]),
    value["$schema"] === UiDocumentEnvelopeSchemaUri.Version1,
    value["envelopeVersion"] === UiDocumentEnvelopeVersion.Version1,
    typeof value["payload"] === "string",
    hasSignatureShape(value["signature"])
  ].every(Boolean);
}

function hasSignatureShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return [
    hasExactKeys(value, ["algorithm", "keyId", "value"]),
    value["algorithm"] === UiDocumentSignatureAlgorithm.Ed25519,
    hasKeyId(value["keyId"]),
    hasEncodedSignature(value["value"])
  ].every(Boolean);
}

function hasKeyId(value: unknown): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

function hasEncodedSignature(value: unknown): boolean {
  return typeof value === "string" && /^[A-Za-z0-9_-]{86}$/u.test(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function assertPayloadSize(payload: string, configuredLimit: number | undefined): void {
  const limit = configuredLimit ?? UnifoldDocumentLoadLimit.MaxPayloadBytes;
  assertPayloadLimit(limit);
  if (new TextEncoder().encode(payload).byteLength > limit) {
    reject(
      UnifoldDocumentLoadDiagnosticCode.PayloadTooLarge,
      "Document payload is too large.",
      "/payload"
    );
  }
}

function assertPayloadLimit(limit: number): void {
  if (Number.isSafeInteger(limit) && limit > 0) return;
  reject(UnifoldDocumentLoadDiagnosticCode.EnvelopeInvalid, "Invalid payload limit.", "/");
}

function decodeBase64Url(value: string): ArrayBuffer | undefined {
  if (!/^[A-Za-z0-9_-]{86}$/u.test(value)) return undefined;
  try {
    const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + "==");
    return binaryBuffer(binary);
  } catch {
    return undefined;
  }
}

function binaryBuffer(binary: string): ArrayBuffer {
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
}

function requireMigration(result: ReturnType<typeof migrateUnifoldDocument>) {
  if (result.status === UnifoldDocumentMigrationStatus.Rejected) {
    throw new DocumentLoadRejection([result.diagnostic]);
  }
  return result;
}

function requirePreparation(
  result: ReturnType<typeof prepareUnifoldDocument>
): PreparedUnifoldDocument {
  if (result.status === UnifoldPreparationStatus.Invalid || result.prepared === undefined) {
    throw new DocumentLoadRejection(result.diagnostics);
  }
  return result.prepared;
}

function loaded(
  prepared: PreparedUnifoldDocument,
  provenance: UnifoldDocumentProvenance
): LoadedUnifoldDocumentResult {
  return { diagnostics: [], prepared, provenance, status: UnifoldDocumentLoadStatus.Loaded };
}

function verifiedKey(keyId: string | undefined): { readonly verifiedKeyId?: string } {
  return keyId === undefined ? {} : { verifiedKeyId: keyId };
}

function rejectKey(keyId: string): never {
  return reject(
    UnifoldDocumentLoadDiagnosticCode.KeyResolutionFailed,
    `No trusted verification key is available for ${keyId}.`,
    "/signature/keyId"
  );
}

function reject(code: UnifoldDocumentLoadDiagnosticCode, message: string, path: string): never {
  throw new DocumentLoadRejection([loadDiagnostic(code, message, path)]);
}

function loadDiagnostic(
  code: UnifoldDocumentLoadDiagnosticCode,
  message: string,
  path: string
): UnifoldApplicationDiagnostic {
  return { code, message, path, stage: UnifoldApplicationDiagnosticStage.DocumentLoading };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!isNonNullObject(value)) return false;
  if (Array.isArray(value)) return false;
  return hasPlainPrototype(value);
}

function isNonNullObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function hasPlainPrototype(value: object): boolean {
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}
