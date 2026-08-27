import {
  UiAiBudgetReservationStatus,
  maximumUiAiCostMicroUsd,
  validUiAiBudget,
  type UiAiBudgetReservationResult
} from "./budget.js";
import { prepareUiPatchGeneration, type UiPatchGenerationPlan } from "./generator.js";
import { UiAiProviderCapability } from "./provider-manifest.js";
import { UiAiProviderResolutionStatus, type ResolvedUiAiProvider } from "./provider-registry.js";
import {
  UiAiGovernedDiagnosticCode,
  type GenerateGovernedUiPatchProposalOptions,
  type UiAiGovernedGenerationResult
} from "./governed-generation-types.js";
import {
  governedRejected,
  runReservedGeneration,
  type PreparedGovernedGeneration
} from "./governed-generation-support.js";

export async function generateGovernedUiPatchProposal(
  options: GenerateGovernedUiPatchProposalOptions
): Promise<UiAiGovernedGenerationResult> {
  const prepared = await prepareGovernedGeneration(options);
  return "diagnostics" in prepared ? prepared : generatePrepared(options, prepared);
}

async function generatePrepared(
  options: GenerateGovernedUiPatchProposalOptions,
  prepared: PreparedGovernedGeneration
): Promise<UiAiGovernedGenerationResult> {
  const reservation = await reserveBudget(options, prepared);
  if ("diagnostics" in reservation) return reservation;
  return completeReservation(options, prepared, reservation);
}

function completeReservation(
  options: GenerateGovernedUiPatchProposalOptions,
  prepared: PreparedGovernedGeneration,
  reservation: UiAiBudgetReservationResult
): Promise<UiAiGovernedGenerationResult> | UiAiGovernedGenerationResult {
  return reservation.status === UiAiBudgetReservationStatus.Reserved
    ? runReservedGeneration(options, prepared, reservation.reservation)
    : governedRejected(UiAiGovernedDiagnosticCode.BudgetDenied);
}

async function prepareGovernedGeneration(
  options: GenerateGovernedUiPatchProposalOptions
): Promise<PreparedGovernedGeneration | UiAiGovernedGenerationResult> {
  const preflight = preflightDiagnostic(options);
  if (preflight !== undefined) return governedRejected(preflight);
  const resolution = options.registry.resolve({
    capability: UiAiProviderCapability.StructuredOutput,
    classification: options.classification,
    region: options.region,
    routeId: options.routeId
  });
  if (resolution.status === UiAiProviderResolutionStatus.Rejected) {
    return governedRejected(UiAiGovernedDiagnosticCode.ProviderRejected);
  }
  return prepareResolvedGeneration(options, resolution.provider);
}

function preflightDiagnostic(
  options: GenerateGovernedUiPatchProposalOptions
): UiAiGovernedDiagnosticCode | undefined {
  return [budgetDiagnostic(options), requestContextDiagnostic(options)].find(
    (code) => code !== undefined
  );
}

function budgetDiagnostic(
  options: GenerateGovernedUiPatchProposalOptions
): UiAiGovernedDiagnosticCode | undefined {
  return validUiAiBudget(options.budget) ? undefined : UiAiGovernedDiagnosticCode.InvalidPolicy;
}

function requestContextDiagnostic(
  options: GenerateGovernedUiPatchProposalOptions
): UiAiGovernedDiagnosticCode | undefined {
  return validRequestContext(options)
    ? undefined
    : UiAiGovernedDiagnosticCode.InvalidRequestContext;
}

function validRequestContext(options: GenerateGovernedUiPatchProposalOptions): boolean {
  return [
    validIdentity(options.requestId),
    validIdentity(options.tenantId),
    validIdentity(options.userId),
    validRouteValue(options.region),
    validRouteValue(options.routeId),
    validTraceId(options.traceId)
  ].every(Boolean);
}

function validIdentity(value: string): boolean {
  return value.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value);
}

function validRouteValue(value: string): boolean {
  return value.length <= 128 && /^[a-z0-9][a-z0-9._-]*$/u.test(value);
}

function validTraceId(value: string): boolean {
  return /^[0-9a-f]{32}$/u.test(value) && value !== "00000000000000000000000000000000";
}

async function prepareResolvedGeneration(
  options: GenerateGovernedUiPatchProposalOptions,
  provider: ResolvedUiAiProvider
): Promise<PreparedGovernedGeneration | UiAiGovernedGenerationResult> {
  const plan = await safePlan(options);
  return "diagnostics" in plan ? plan : preparePlannedGeneration(options, provider, plan);
}

async function preparePlannedGeneration(
  options: GenerateGovernedUiPatchProposalOptions,
  provider: ResolvedUiAiProvider,
  plan: UiPatchGenerationPlan
): Promise<PreparedGovernedGeneration | UiAiGovernedGenerationResult> {
  const estimate = await safeEstimate(options, provider, plan);
  return typeof estimate === "number"
    ? prepareEstimatedGeneration(options, provider, plan, estimate)
    : estimate;
}

function prepareEstimatedGeneration(
  options: GenerateGovernedUiPatchProposalOptions,
  provider: ResolvedUiAiProvider,
  plan: UiPatchGenerationPlan,
  estimate: number
): PreparedGovernedGeneration | UiAiGovernedGenerationResult {
  const manifest = provider.manifest.manifest;
  if (tokenLimitsExceeded(options, provider, estimate)) {
    return governedRejected(UiAiGovernedDiagnosticCode.InvalidPolicy);
  }
  const maximumCostMicroUsd = maximumUiAiCostMicroUsd(
    manifest,
    estimate,
    options.budget.maximumOutputTokens
  );
  return maximumCostMicroUsd > options.budget.maximumCostMicroUsd
    ? governedRejected(UiAiGovernedDiagnosticCode.InvalidPolicy)
    : { inputTokenLimit: estimate, maximumCostMicroUsd, plan, provider };
}

function tokenLimitsExceeded(
  options: GenerateGovernedUiPatchProposalOptions,
  provider: ResolvedUiAiProvider,
  estimate: number
): boolean {
  const manifest = provider.manifest.manifest;
  return (
    [options.budget.maximumInputTokens, manifest.maximumInputTokens].some(
      (limit) => estimate > limit
    ) || options.budget.maximumOutputTokens > manifest.maximumOutputTokens
  );
}

async function safePlan(
  options: GenerateGovernedUiPatchProposalOptions
): Promise<UiPatchGenerationPlan | UiAiGovernedGenerationResult> {
  try {
    return await prepareUiPatchGeneration(options);
  } catch {
    return governedRejected(UiAiGovernedDiagnosticCode.ContextRejected);
  }
}

async function safeEstimate(
  options: GenerateGovernedUiPatchProposalOptions,
  provider: ResolvedUiAiProvider,
  plan: UiPatchGenerationPlan
): Promise<number | UiAiGovernedGenerationResult> {
  try {
    const estimate = await options.estimator.estimateUpperBoundTokens({
      modelId: provider.manifest.manifest.modelId,
      prompt: plan.prompt,
      providerId: provider.manifest.manifest.providerId,
      system: plan.system
    });
    return positiveInteger(estimate)
      ? estimate
      : governedRejected(UiAiGovernedDiagnosticCode.TokenEstimateFailed);
  } catch {
    return governedRejected(UiAiGovernedDiagnosticCode.TokenEstimateFailed);
  }
}

async function reserveBudget(
  options: GenerateGovernedUiPatchProposalOptions,
  prepared: PreparedGovernedGeneration
): Promise<UiAiBudgetReservationResult | UiAiGovernedGenerationResult> {
  try {
    return await options.ledger.reserve({
      inputTokenLimit: prepared.inputTokenLimit,
      maximumCostMicroUsd: prepared.maximumCostMicroUsd,
      outputTokenLimit: options.budget.maximumOutputTokens,
      requestId: options.requestId,
      tenantId: options.tenantId,
      traceId: options.traceId,
      userId: options.userId
    });
  } catch {
    return governedRejected(UiAiGovernedDiagnosticCode.BudgetReservationFailed);
  }
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
