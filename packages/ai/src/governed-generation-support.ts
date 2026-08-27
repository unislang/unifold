import {
  UiAiBudgetSettlementOutcome,
  calculateUiAiCostMicroUsd,
  validUiAiUsage,
  type UiAiBudgetReservation,
  type UiAiTokenUsage
} from "./budget.js";
import { generatePreparedUiPatchProposal, type UiPatchGenerationPlan } from "./generator.js";
import {
  UiAiGovernedDiagnosticCode,
  UiAiGovernedGenerationStatus,
  type GenerateGovernedUiPatchProposalOptions,
  type UiAiGovernedGenerationResult
} from "./governed-generation-types.js";
import type { ResolvedUiAiProvider } from "./provider-registry.js";
import type { UiPatchProposal } from "./types.js";

export interface PreparedGovernedGeneration {
  readonly inputTokenLimit: number;
  readonly maximumCostMicroUsd: number;
  readonly plan: UiPatchGenerationPlan;
  readonly provider: ResolvedUiAiProvider;
}

export async function runReservedGeneration(
  options: GenerateGovernedUiPatchProposalOptions,
  prepared: PreparedGovernedGeneration,
  reservation: UiAiBudgetReservation
): Promise<UiAiGovernedGenerationResult> {
  const startedAt = currentTime(options);
  try {
    const result = await generatePreparedUiPatchProposal(prepared.plan, {
      ...(options.abortSignal === undefined ? {} : { abortSignal: options.abortSignal }),
      maxOutputTokens: options.budget.maximumOutputTokens,
      maxRetries: options.budget.maximumRetries,
      model: prepared.provider.model,
      timeoutMs: options.budget.timeoutMs
    });
    return finishGeneration(options, prepared, reservation, startedAt, result);
  } catch (error) {
    return finishProviderFailure(options, reservation, error);
  }
}

async function finishGeneration(
  options: GenerateGovernedUiPatchProposalOptions,
  prepared: PreparedGovernedGeneration,
  reservation: UiAiBudgetReservation,
  startedAt: number,
  result: Awaited<ReturnType<typeof generatePreparedUiPatchProposal>>
): Promise<UiAiGovernedGenerationResult> {
  const usage = normalizedUiAiUsage(result.usage);
  if (usage === undefined) {
    return settleRejection(options, reservation, UiAiGovernedDiagnosticCode.UsageInvalid);
  }
  return finishUsage(options, prepared, reservation, startedAt, result.proposal, usage);
}

async function finishUsage(
  options: GenerateGovernedUiPatchProposalOptions,
  prepared: PreparedGovernedGeneration,
  reservation: UiAiBudgetReservation,
  startedAt: number,
  proposal: UiPatchProposal,
  usage: UiAiTokenUsage
): Promise<UiAiGovernedGenerationResult> {
  if (tokenUsageOverrun(options, prepared, usage)) {
    return finishTokenOverrun(options, reservation, usage);
  }
  const cost = calculateUiAiCostMicroUsd(prepared.provider.manifest.manifest, usage);
  const overrun = cost > prepared.maximumCostMicroUsd;
  const settled = await settle(options, reservation, settlementOutcome(overrun), usage, cost);
  return finishCost(options, prepared, proposal, usage, cost, startedAt, settled, overrun);
}

async function finishTokenOverrun(
  options: GenerateGovernedUiPatchProposalOptions,
  reservation: UiAiBudgetReservation,
  usage: UiAiTokenUsage
): Promise<UiAiGovernedGenerationResult> {
  const settled = await settle(options, reservation, UiAiBudgetSettlementOutcome.Overrun, usage);
  return settled
    ? governedRejected(UiAiGovernedDiagnosticCode.BudgetOverrun)
    : governedRejected(UiAiGovernedDiagnosticCode.BudgetSettlementFailed);
}

function finishCost(
  options: GenerateGovernedUiPatchProposalOptions,
  prepared: PreparedGovernedGeneration,
  proposal: UiPatchProposal,
  usage: UiAiTokenUsage,
  cost: number,
  startedAt: number,
  settled: boolean,
  overrun: boolean
): UiAiGovernedGenerationResult {
  if (!settled) return governedRejected(UiAiGovernedDiagnosticCode.BudgetSettlementFailed);
  if (overrun) return governedRejected(UiAiGovernedDiagnosticCode.BudgetOverrun);
  return succeeded(options, prepared, proposal, usage, cost, currentTime(options) - startedAt);
}

function tokenUsageOverrun(
  options: GenerateGovernedUiPatchProposalOptions,
  prepared: PreparedGovernedGeneration,
  usage: UiAiTokenUsage
): boolean {
  return (
    usage.inputTokens > prepared.inputTokenLimit ||
    usage.outputTokens > options.budget.maximumOutputTokens
  );
}

function settlementOutcome(overrun: boolean): UiAiBudgetSettlementOutcome {
  return overrun ? UiAiBudgetSettlementOutcome.Overrun : UiAiBudgetSettlementOutcome.Completed;
}

async function finishProviderFailure(
  options: GenerateGovernedUiPatchProposalOptions,
  reservation: UiAiBudgetReservation,
  error: unknown
): Promise<UiAiGovernedGenerationResult> {
  const settled = await settle(options, reservation, UiAiBudgetSettlementOutcome.Failed);
  if (!settled) return governedRejected(UiAiGovernedDiagnosticCode.BudgetSettlementFailed);
  return governedRejected(providerFailureDiagnosticCode(options.abortSignal, error));
}

async function settleRejection(
  options: GenerateGovernedUiPatchProposalOptions,
  reservation: UiAiBudgetReservation,
  code: UiAiGovernedDiagnosticCode
): Promise<UiAiGovernedGenerationResult> {
  const settled = await settle(options, reservation, UiAiBudgetSettlementOutcome.Failed);
  return settled
    ? governedRejected(code)
    : governedRejected(UiAiGovernedDiagnosticCode.BudgetSettlementFailed);
}

async function settle(
  options: GenerateGovernedUiPatchProposalOptions,
  reservation: UiAiBudgetReservation,
  outcome: UiAiBudgetSettlementOutcome,
  usage?: UiAiTokenUsage,
  actualCostMicroUsd?: number
): Promise<boolean> {
  try {
    await options.ledger.settle(settlementRecord(reservation, outcome, usage, actualCostMicroUsd));
    return true;
  } catch {
    return false;
  }
}

function settlementRecord(
  reservation: UiAiBudgetReservation,
  outcome: UiAiBudgetSettlementOutcome,
  usage: UiAiTokenUsage | undefined,
  actualCostMicroUsd: number | undefined
) {
  return {
    ...(actualCostMicroUsd === undefined ? {} : { actualCostMicroUsd }),
    outcome,
    reservationId: reservation.reservationId,
    ...(usage === undefined ? {} : { usage })
  };
}

export function normalizedUiAiUsage(value: {
  readonly inputTokens: number | undefined;
  readonly outputTokens: number | undefined;
}): UiAiTokenUsage | undefined {
  if (missingUsage(value)) return undefined;
  return validatedUsage({
    inputTokens: Number(value.inputTokens),
    outputTokens: Number(value.outputTokens),
    totalTokens: Number(value.inputTokens) + Number(value.outputTokens)
  });
}

function missingUsage(value: {
  readonly inputTokens: number | undefined;
  readonly outputTokens: number | undefined;
}): boolean {
  return value.inputTokens === undefined || value.outputTokens === undefined;
}

function validatedUsage(usage: UiAiTokenUsage): UiAiTokenUsage | undefined {
  return validUiAiUsage(usage) ? usage : undefined;
}

function succeeded(
  options: GenerateGovernedUiPatchProposalOptions,
  prepared: PreparedGovernedGeneration,
  proposal: UiPatchProposal,
  usage: UiAiTokenUsage,
  costMicroUsd: number,
  durationMs: number
): UiAiGovernedGenerationResult {
  return {
    diagnostics: [],
    proposal,
    receipt: receipt(options, prepared, usage, costMicroUsd, durationMs),
    status: UiAiGovernedGenerationStatus.Succeeded
  };
}

function receipt(
  options: GenerateGovernedUiPatchProposalOptions,
  prepared: PreparedGovernedGeneration,
  usage: UiAiTokenUsage,
  costMicroUsd: number,
  durationMs: number
) {
  const signed = prepared.provider.manifest;
  return {
    costMicroUsd,
    durationMs,
    manifestId: signed.manifest.manifestId,
    modelId: signed.manifest.modelId,
    policyVersion: signed.manifest.policyVersion,
    promptVersion: signed.manifest.promptVersion,
    providerId: signed.manifest.providerId,
    requestId: options.requestId,
    retryLimit: options.budget.maximumRetries,
    routeId: prepared.provider.routeId,
    signatureKeyId: signed.signature.keyId,
    timeoutMs: options.budget.timeoutMs,
    traceId: options.traceId,
    usage
  };
}

export function providerFailureDiagnosticCode(
  signal: AbortSignal | undefined,
  error: unknown
): UiAiGovernedDiagnosticCode {
  if (signalAborted(signal)) return UiAiGovernedDiagnosticCode.Cancelled;
  if (errorName(error) === "TimeoutError") return UiAiGovernedDiagnosticCode.TimedOut;
  return UiAiGovernedDiagnosticCode.ProviderFailed;
}

function signalAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

function errorName(error: unknown): string | undefined {
  if (error instanceof Error) return usefulErrorName(error);
  return causeName(error);
}

function usefulErrorName(error: Error): string | undefined {
  return error.name === "Error" ? undefined : error.name;
}

function causeName(error: unknown): string | undefined {
  const cause = record(error) ? error["cause"] : undefined;
  return cause instanceof Error ? cause.name : undefined;
}

export function governedRejected(code: UiAiGovernedDiagnosticCode): UiAiGovernedGenerationResult {
  return {
    diagnostics: [{ code, message: `Governed generation rejected: ${code}.` }],
    status: UiAiGovernedGenerationStatus.Rejected
  };
}

function currentTime(options: GenerateGovernedUiPatchProposalOptions): number {
  return options.clock?.() ?? Date.now();
}

function record(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object";
}
