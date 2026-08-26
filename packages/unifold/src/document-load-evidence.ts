import type { UiDocumentSignature } from "@unislang/unifold-contracts";

import { DocumentProvenanceError, recordDocumentLoadAudit } from "./document-provenance.js";
import {
  UnifoldDocumentLoadAuditOutcome,
  UnifoldDocumentLoadDiagnosticCode,
  UnifoldDocumentLoadStatus,
  UnifoldDocumentSourceKind,
  type LoadUnifoldDocumentOptions,
  type LoadUnifoldDocumentResult,
  type UnifoldDocumentIntegrity,
  type UnifoldDocumentLoadAuditRecord,
  type UnifoldDocumentProvenanceAudit
} from "./document-loading-types.js";
import { UnifoldApplicationDiagnosticStage, type UnifoldApplicationDiagnostic } from "./types.js";

export interface DocumentLoadEvidence {
  auditAttempted: boolean;
  integrity?: UnifoldDocumentIntegrity;
  issuer?: string;
  keyId?: string;
  migrationCount: number;
  payloadSha256?: string;
  sourceKind: UnifoldDocumentSourceKind;
}

export class DocumentLoadRejection extends Error {
  constructor(readonly diagnostics: readonly UnifoldApplicationDiagnostic[]) {
    super(diagnostics[0]?.message ?? "Document loading was rejected.");
  }
}

export function createDocumentLoadEvidence(source: unknown): DocumentLoadEvidence {
  return {
    auditAttempted: false,
    migrationCount: 0,
    sourceKind:
      typeof source === "string"
        ? UnifoldDocumentSourceKind.UnsignedJson
        : UnifoldDocumentSourceKind.Unknown
  };
}

export function captureDocumentSignature(
  evidence: DocumentLoadEvidence,
  signature: UiDocumentSignature | undefined
): void {
  if (signature === undefined) return;
  evidence.keyId = signature.keyId;
  evidence.sourceKind = UnifoldDocumentSourceKind.SignedEnvelope;
}

export async function auditDocumentLoad(
  options: LoadUnifoldDocumentOptions,
  evidence: DocumentLoadEvidence,
  outcome: UnifoldDocumentLoadAuditOutcome,
  diagnosticCode?: string
): Promise<UnifoldDocumentProvenanceAudit | undefined> {
  if (options.provenancePolicy === undefined) return undefined;
  evidence.auditAttempted = true;
  const receipt = await recordDocumentLoadAudit(
    options.provenancePolicy,
    auditRecord(evidence, outcome, diagnosticCode)
  );
  return receipt === undefined
    ? undefined
    : { recordId: receipt.recordId, recordedAt: receipt.recordedAt };
}

export function rejectDocument(
  code: UnifoldDocumentLoadDiagnosticCode,
  message: string,
  path: string
): never {
  throw new DocumentLoadRejection([loadDiagnostic(code, message, path)]);
}

export async function rejectDocumentLoad(
  error: unknown,
  options: LoadUnifoldDocumentOptions,
  evidence: DocumentLoadEvidence
): Promise<LoadUnifoldDocumentResult> {
  captureProvenanceError(error, evidence);
  const diagnostics = loadDiagnostics(error);
  const audited = await auditRejection(diagnostics, options, evidence);
  return { diagnostics: audited, status: UnifoldDocumentLoadStatus.Rejected };
}

function loadDiagnostics(error: unknown): readonly UnifoldApplicationDiagnostic[] {
  if (error instanceof DocumentLoadRejection) return error.diagnostics;
  if (error instanceof DocumentProvenanceError) {
    return [loadDiagnostic(error.code, error.message, error.path)];
  }
  return [loadDiagnostic(UnifoldDocumentLoadDiagnosticCode.EnvelopeInvalid, "Invalid input.", "/")];
}

async function auditRejection(
  diagnostics: readonly UnifoldApplicationDiagnostic[],
  options: LoadUnifoldDocumentOptions,
  evidence: DocumentLoadEvidence
): Promise<readonly UnifoldApplicationDiagnostic[]> {
  if (evidence.auditAttempted) return diagnostics;
  return recordRejectedAudit(diagnostics, options, evidence);
}

async function recordRejectedAudit(
  diagnostics: readonly UnifoldApplicationDiagnostic[],
  options: LoadUnifoldDocumentOptions,
  evidence: DocumentLoadEvidence
): Promise<readonly UnifoldApplicationDiagnostic[]> {
  try {
    await auditDocumentLoad(
      options,
      evidence,
      UnifoldDocumentLoadAuditOutcome.Rejected,
      diagnostics[0]?.code
    );
    return diagnostics;
  } catch (error) {
    return [...diagnostics, ...loadDiagnostics(error)];
  }
}

function captureProvenanceError(error: unknown, evidence: DocumentLoadEvidence): void {
  if (error instanceof DocumentProvenanceError && error.issuer !== undefined) {
    evidence.issuer = error.issuer;
  }
}

function loadDiagnostic(
  code: UnifoldDocumentLoadDiagnosticCode,
  message: string,
  path: string
): UnifoldApplicationDiagnostic {
  return { code, message, path, stage: UnifoldApplicationDiagnosticStage.DocumentLoading };
}

function auditRecord(
  evidence: DocumentLoadEvidence,
  outcome: UnifoldDocumentLoadAuditOutcome,
  diagnosticCode: string | undefined
): UnifoldDocumentLoadAuditRecord {
  return {
    migrationCount: evidence.migrationCount,
    outcome,
    sourceKind: evidence.sourceKind,
    ...optional("diagnosticCode", diagnosticCode),
    ...optional("integrity", evidence.integrity),
    ...optional("issuer", evidence.issuer),
    ...optional("keyId", evidence.keyId),
    ...optional("payloadSha256", evidence.payloadSha256)
  };
}

function optional<Key extends string, Value>(
  key: Key,
  value: Value | undefined
): Partial<Record<Key, Value>> {
  return value === undefined ? {} : ({ [key]: value } as Record<Key, Value>);
}
