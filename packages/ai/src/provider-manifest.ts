import { DataClassification } from "@unislang/unifold-contracts";
import { z } from "zod";

import { canonicalJson } from "./fingerprint.js";

export enum UiAiProviderCapability {
  StructuredOutput = "structured-output"
}

export enum UiAiManifestCurrency {
  Usd = "USD"
}

export enum UiAiManifestSignatureAlgorithm {
  Ed25519 = "Ed25519"
}

export enum UiAiProviderManifestVersion {
  Version1 = "1.0.0"
}

export enum UiAiManifestVerificationStatus {
  Rejected = "rejected",
  Verified = "verified"
}

export enum UiAiManifestDiagnosticCode {
  DuplicateValue = "duplicate-value",
  Expired = "expired",
  FutureEvidence = "future-evidence",
  InvalidManifest = "invalid-manifest",
  InvalidSignature = "invalid-signature",
  NotYetValid = "not-yet-valid",
  Retired = "retired",
  UntrustedKey = "untrusted-key"
}

export interface UiAiProviderManifest {
  readonly capabilities: readonly UiAiProviderCapability[];
  readonly classifications: readonly DataClassification[];
  readonly evaluation: {
    readonly passedAt: string;
    readonly suiteId: string;
    readonly suiteVersion: string;
  };
  readonly expiresAt: string;
  readonly manifestId: string;
  readonly maximumInputTokens: number;
  readonly maximumOutputTokens: number;
  readonly modelId: string;
  readonly notBefore: string;
  readonly policyVersion: string;
  readonly pricing: {
    readonly capturedAt: string;
    readonly currency: UiAiManifestCurrency;
    readonly inputMicroUsdPerMillionTokens: number;
    readonly outputMicroUsdPerMillionTokens: number;
  };
  readonly promptVersion: string;
  readonly providerId: string;
  readonly regions: readonly string[];
  readonly retirementAt?: string;
  readonly version: UiAiProviderManifestVersion;
}

export interface SignedUiAiProviderManifest {
  readonly manifest: UiAiProviderManifest;
  readonly signature: {
    readonly algorithm: UiAiManifestSignatureAlgorithm;
    readonly keyId: string;
    readonly value: string;
  };
}

export interface UiAiManifestDiagnostic {
  readonly code: UiAiManifestDiagnosticCode;
  readonly message: string;
}

export interface VerifyUiAiProviderManifestOptions {
  readonly nowEpochMs: number;
  readonly signedManifest: unknown;
  readonly trustedKeys: ReadonlyMap<string, CryptoKey>;
}

export type UiAiManifestVerificationResult =
  | {
      readonly diagnostics: readonly [];
      readonly signedManifest: SignedUiAiProviderManifest;
      readonly status: UiAiManifestVerificationStatus.Verified;
    }
  | {
      readonly diagnostics: readonly UiAiManifestDiagnostic[];
      readonly status: UiAiManifestVerificationStatus.Rejected;
    };

const identifier = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9._-]*$/u);
const version = z.string().min(1).max(64);
const timestamp = z.string().min(20).max(40);
const positiveInteger = z.number().int().positive().max(10_000_000);
const price = z.number().int().nonnegative().max(1_000_000_000);

const manifestSchema = z.strictObject({
  capabilities: z.array(z.enum(UiAiProviderCapability)).min(1).max(16),
  classifications: z.array(z.enum(DataClassification)).min(1).max(5),
  evaluation: z.strictObject({ passedAt: timestamp, suiteId: identifier, suiteVersion: version }),
  expiresAt: timestamp,
  manifestId: identifier,
  maximumInputTokens: positiveInteger,
  maximumOutputTokens: positiveInteger,
  modelId: identifier,
  notBefore: timestamp,
  policyVersion: version,
  pricing: z.strictObject({
    capturedAt: timestamp,
    currency: z.enum(UiAiManifestCurrency),
    inputMicroUsdPerMillionTokens: price,
    outputMicroUsdPerMillionTokens: price
  }),
  promptVersion: version,
  providerId: identifier,
  regions: z.array(identifier).min(1).max(64),
  retirementAt: timestamp.optional(),
  version: z.enum(UiAiProviderManifestVersion)
});

const signedManifestSchema = z.strictObject({
  manifest: manifestSchema,
  signature: z.strictObject({
    algorithm: z.enum(UiAiManifestSignatureAlgorithm),
    keyId: identifier,
    value: z.string().min(1).max(512)
  })
});

export async function verifyUiAiProviderManifest(
  options: VerifyUiAiProviderManifestOptions
): Promise<UiAiManifestVerificationResult> {
  const parsed = signedManifestSchema.safeParse(options.signedManifest);
  if (!parsed.success) return rejected(UiAiManifestDiagnosticCode.InvalidManifest);
  return verifyParsedManifest(parsed.data as SignedUiAiProviderManifest, options);
}

async function verifyParsedManifest(
  signedManifest: SignedUiAiProviderManifest,
  options: VerifyUiAiProviderManifestOptions
): Promise<UiAiManifestVerificationResult> {
  const diagnostic = inspectManifest(signedManifest.manifest, options.nowEpochMs);
  if (diagnostic !== undefined) return rejected(diagnostic);
  return verifyManifestSignature(signedManifest, options.trustedKeys);
}

async function verifyManifestSignature(
  signedManifest: SignedUiAiProviderManifest,
  trustedKeys: ReadonlyMap<string, CryptoKey>
): Promise<UiAiManifestVerificationResult> {
  const key = trustedKeys.get(signedManifest.signature.keyId);
  if (key === undefined) return rejected(UiAiManifestDiagnosticCode.UntrustedKey);
  return signatureResult(signedManifest, await validSignature(signedManifest, key));
}

function signatureResult(
  signedManifest: SignedUiAiProviderManifest,
  valid: boolean
): UiAiManifestVerificationResult {
  return valid
    ? { diagnostics: [], signedManifest, status: UiAiManifestVerificationStatus.Verified }
    : rejected(UiAiManifestDiagnosticCode.InvalidSignature);
}

function inspectManifest(
  manifest: UiAiProviderManifest,
  now: number
): UiAiManifestDiagnosticCode | undefined {
  return [
    timeDiagnostic(manifest),
    duplicateDiagnostic(manifest),
    uiAiManifestTemporalDiagnostic(manifest, now)
  ].find((code) => code !== undefined);
}

export function uiAiManifestTemporalDiagnostic(
  manifest: UiAiProviderManifest,
  now: number
): UiAiManifestDiagnosticCode | undefined {
  return [
    notYetValidDiagnostic(manifest, now),
    expiredDiagnostic(manifest, now),
    retiredDiagnostic(manifest, now),
    evidenceDiagnostic(manifest, now)
  ].find((code) => code !== undefined);
}

function timeDiagnostic(manifest: UiAiProviderManifest): UiAiManifestDiagnosticCode | undefined {
  return validTimes(manifest) ? undefined : UiAiManifestDiagnosticCode.InvalidManifest;
}

function duplicateDiagnostic(
  manifest: UiAiProviderManifest
): UiAiManifestDiagnosticCode | undefined {
  return hasDuplicates(manifest.capabilities, manifest.classifications, manifest.regions)
    ? UiAiManifestDiagnosticCode.DuplicateValue
    : undefined;
}

function evidenceDiagnostic(
  manifest: UiAiProviderManifest,
  now: number
): UiAiManifestDiagnosticCode | undefined {
  return futureEvidence(manifest, now) ? UiAiManifestDiagnosticCode.FutureEvidence : undefined;
}

function notYetValidDiagnostic(
  manifest: UiAiProviderManifest,
  now: number
): UiAiManifestDiagnosticCode | undefined {
  return now < Date.parse(manifest.notBefore) ? UiAiManifestDiagnosticCode.NotYetValid : undefined;
}

function expiredDiagnostic(
  manifest: UiAiProviderManifest,
  now: number
): UiAiManifestDiagnosticCode | undefined {
  return now >= Date.parse(manifest.expiresAt) ? UiAiManifestDiagnosticCode.Expired : undefined;
}

function retiredDiagnostic(
  manifest: UiAiProviderManifest,
  now: number
): UiAiManifestDiagnosticCode | undefined {
  return retired(manifest, now) ? UiAiManifestDiagnosticCode.Retired : undefined;
}

function validTimes(manifest: UiAiProviderManifest): boolean {
  const values = [
    manifest.notBefore,
    manifest.expiresAt,
    manifest.pricing.capturedAt,
    manifest.evaluation.passedAt,
    ...(manifest.retirementAt === undefined ? [] : [manifest.retirementAt])
  ];
  return values.every(validTimestamp) && validTimeline(manifest);
}

function validTimestamp(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function hasDuplicates(...values: readonly (readonly string[])[]): boolean {
  return values.some((items) => new Set(items).size !== items.length);
}

function retired(manifest: UiAiProviderManifest, now: number): boolean {
  return manifest.retirementAt !== undefined && now >= Date.parse(manifest.retirementAt);
}

function futureEvidence(manifest: UiAiProviderManifest, now: number): boolean {
  return (
    Date.parse(manifest.pricing.capturedAt) > now || Date.parse(manifest.evaluation.passedAt) > now
  );
}

function validTimeline(manifest: UiAiProviderManifest): boolean {
  const begins = Date.parse(manifest.notBefore);
  const retirement = manifest.retirementAt;
  return (
    begins < Date.parse(manifest.expiresAt) &&
    (retirement === undefined || begins < Date.parse(retirement))
  );
}

async function validSignature(
  signedManifest: SignedUiAiProviderManifest,
  key: CryptoKey
): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      UiAiManifestSignatureAlgorithm.Ed25519,
      key,
      decodeBase64Url(signedManifest.signature.value),
      new TextEncoder().encode(canonicalJson(signedManifest.manifest))
    );
  } catch {
    return false;
  }
}

function decodeBase64Url(value: string): ArrayBuffer {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function rejected(code: UiAiManifestDiagnosticCode): UiAiManifestVerificationResult {
  return {
    diagnostics: [{ code, message: `Provider manifest rejected: ${code}.` }],
    status: UiAiManifestVerificationStatus.Rejected
  };
}
