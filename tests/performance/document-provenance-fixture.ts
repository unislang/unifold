import {
  UiDocumentEnvelopeSchemaUri,
  UiDocumentEnvelopeVersion,
  UiDocumentSignatureAlgorithm,
  type SignedUiDocumentEnvelope
} from "@unislang/unifold-contracts";
import {
  UnifoldDocumentKeyStatus,
  UnifoldDocumentLoadDiagnosticCode,
  UnifoldDocumentLoadStatus,
  UnifoldDocumentTrustRequirement,
  loadUnifoldDocument,
  type LoadUnifoldDocumentOptions
} from "@unislang/unifold";

import { createCompilationDocument } from "./document-compilation-fixture.js";
import { percentile } from "./profile-statistics.js";

const OPERATION_COUNT = 1_000;
const PROFILE_SAMPLES = 5;
const ACCEPTED_P95_LIMIT_MILLISECONDS = 5_000;
const REVOKED_P95_LIMIT_MILLISECONDS = 1_000;
const RECORDED_AT = "2026-08-26T08:00:00.000Z";

interface Measurement {
  readonly auditCount: number;
  readonly exact: boolean;
  readonly milliseconds: number;
}

interface Sample {
  readonly accepted: Measurement;
  readonly revoked: Measurement;
}

export async function measureDocumentProvenancePerformance(sampleCount = PROFILE_SAMPLES) {
  const harness = await createHarness();
  const samples: Sample[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    samples.push(await measureSample(harness));
  }
  const accepted = statistics(samples.map(({ accepted }) => accepted.milliseconds));
  const revoked = statistics(samples.map(({ revoked }) => revoked.milliseconds));
  const verified = {
    accepted: samples.every(({ accepted }) => accepted.exact),
    revoked: samples.every(({ revoked }) => revoked.exact)
  };
  return {
    accepted,
    auditCounts: samples.map(({ accepted, revoked }) => ({
      accepted: accepted.auditCount,
      revoked: revoked.auditCount
    })),
    gates: gates(accepted, revoked, verified),
    operationCount: OPERATION_COUNT,
    revoked,
    sampleCount,
    verified
  };
}

async function measureSample(harness: Awaited<ReturnType<typeof createHarness>>): Promise<Sample> {
  return {
    accepted: await measureAccepted(harness),
    revoked: await measureRevoked(harness)
  };
}

async function measureAccepted(
  harness: Awaited<ReturnType<typeof createHarness>>
): Promise<Measurement> {
  const audited = auditCounter();
  const options = governedOptions(harness.publicKey, UnifoldDocumentKeyStatus.Active, audited);
  let exact = true;
  const started = performance.now();
  for (let index = 0; index < OPERATION_COUNT; index += 1) {
    const result = await loadUnifoldDocument(harness.envelope, options);
    exact = exact && acceptedResultExact(result, index + 1);
  }
  return measurement(started, exact, audited.count());
}

async function measureRevoked(
  harness: Awaited<ReturnType<typeof createHarness>>
): Promise<Measurement> {
  const audited = auditCounter();
  const options = governedOptions(harness.publicKey, UnifoldDocumentKeyStatus.Revoked, audited);
  let exact = true;
  const started = performance.now();
  for (let index = 0; index < OPERATION_COUNT; index += 1) {
    const result = await loadUnifoldDocument(harness.envelope, options);
    exact = exact && revokedResultExact(result);
  }
  return measurement(started, exact, audited.count());
}

function revokedResultExact(result: Awaited<ReturnType<typeof loadUnifoldDocument>>): boolean {
  if (result.status !== UnifoldDocumentLoadStatus.Rejected) return false;
  return result.diagnostics[0]?.code === UnifoldDocumentLoadDiagnosticCode.KeyRevoked;
}

function acceptedResultExact(
  result: Awaited<ReturnType<typeof loadUnifoldDocument>>,
  auditSequence: number
): boolean {
  if (result.status !== UnifoldDocumentLoadStatus.Loaded) return false;
  return [
    result.prepared.document.renderOrder.length === 2,
    result.provenance.verifiedIssuer === "https://benchmark-issuer.example",
    result.provenance.verifiedKeyId === "benchmark-key-1",
    result.provenance.payloadSha256.length === 64,
    result.provenance.audit?.recordId === `document-audit-${auditSequence}`
  ].every(Boolean);
}

function measurement(started: number, exact: boolean, auditCount: number): Measurement {
  return {
    auditCount,
    exact: exact && auditCount === OPERATION_COUNT,
    milliseconds: performance.now() - started
  };
}

async function createHarness() {
  const keys = await globalThis.crypto.subtle.generateKey("Ed25519", false, ["sign", "verify"]);
  const payload = JSON.stringify(createCompilationDocument(2));
  return {
    envelope: await signedEnvelope(payload, keys.privateKey),
    publicKey: keys.publicKey
  };
}

function governedOptions(
  publicKey: CryptoKey,
  status: UnifoldDocumentKeyStatus,
  audit: ReturnType<typeof auditCounter>
): LoadUnifoldDocumentOptions {
  return {
    provenancePolicy: {
      audit,
      trustResolver: {
        resolve: async () => ({
          issuer: "https://benchmark-issuer.example",
          key: publicKey,
          status
        })
      }
    },
    trustRequirement: UnifoldDocumentTrustRequirement.RequireSignature
  };
}

function auditCounter() {
  let records = 0;
  return {
    count: () => records,
    record: async () => {
      records += 1;
      return { recordId: `document-audit-${records}`, recordedAt: RECORDED_AT };
    }
  };
}

async function signedEnvelope(
  payload: string,
  privateKey: CryptoKey
): Promise<SignedUiDocumentEnvelope> {
  const signature = await globalThis.crypto.subtle.sign(
    UiDocumentSignatureAlgorithm.Ed25519,
    privateKey,
    new TextEncoder().encode(payload)
  );
  return {
    $schema: UiDocumentEnvelopeSchemaUri.Version1,
    envelopeVersion: UiDocumentEnvelopeVersion.Version1,
    payload,
    signature: {
      algorithm: UiDocumentSignatureAlgorithm.Ed25519,
      keyId: "benchmark-key-1",
      value: encode(new Uint8Array(signature))
    }
  };
}

function encode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((value) => (binary += String.fromCharCode(value)));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function gates(
  accepted: ReturnType<typeof statistics>,
  revoked: ReturnType<typeof statistics>,
  verified: { readonly accepted: boolean; readonly revoked: boolean }
) {
  return [
    gate(
      "1k governed signed document loads",
      accepted.p95Milliseconds,
      ACCEPTED_P95_LIMIT_MILLISECONDS,
      verified.accepted
    ),
    gate(
      "1k revoked document denials",
      revoked.p95Milliseconds,
      REVOKED_P95_LIMIT_MILLISECONDS,
      verified.revoked
    )
  ];
}

function gate(name: string, actual: number, limit: number, exact: boolean) {
  return {
    actualP95Milliseconds: actual,
    exact,
    limitP95Milliseconds: limit,
    name,
    passed: actual <= limit && exact
  };
}

function statistics(samples: readonly number[]) {
  return {
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds: percentile(samples, 0.95),
    p99Milliseconds: percentile(samples, 0.99)
  };
}
