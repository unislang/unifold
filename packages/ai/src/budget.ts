import type { UiAiProviderManifest } from "./provider-manifest.js";

export enum UiAiBudgetReservationStatus {
  Denied = "denied",
  Reserved = "reserved"
}

export enum UiAiBudgetSettlementOutcome {
  Completed = "completed",
  Failed = "failed",
  Overrun = "overrun"
}

export interface UiAiGenerationBudget {
  readonly maximumCostMicroUsd: number;
  readonly maximumInputTokens: number;
  readonly maximumOutputTokens: number;
  readonly maximumRetries: number;
  readonly timeoutMs: number;
}

export interface UiAiBudgetReservationRequest {
  readonly inputTokenLimit: number;
  readonly maximumCostMicroUsd: number;
  readonly outputTokenLimit: number;
  readonly requestId: string;
  readonly tenantId: string;
  readonly traceId: string;
  readonly userId: string;
}

export interface UiAiBudgetReservation {
  readonly reservationId: string;
}

export type UiAiBudgetReservationResult =
  | {
      readonly reservation: UiAiBudgetReservation;
      readonly status: UiAiBudgetReservationStatus.Reserved;
    }
  | { readonly status: UiAiBudgetReservationStatus.Denied };

export interface UiAiTokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export interface UiAiBudgetSettlement {
  readonly actualCostMicroUsd?: number;
  readonly outcome: UiAiBudgetSettlementOutcome;
  readonly reservationId: string;
  readonly usage?: UiAiTokenUsage;
}

export interface UiAiBudgetLedger {
  reserve(request: UiAiBudgetReservationRequest): Promise<UiAiBudgetReservationResult>;
  settle(settlement: UiAiBudgetSettlement): Promise<void>;
}

export interface UiAiTokenUpperBoundEstimator {
  estimateUpperBoundTokens(input: {
    readonly modelId: string;
    readonly prompt: string;
    readonly providerId: string;
    readonly system: string;
  }): Promise<number>;
}

export function calculateUiAiCostMicroUsd(
  manifest: UiAiProviderManifest,
  usage: Pick<UiAiTokenUsage, "inputTokens" | "outputTokens">
): number {
  const input = BigInt(usage.inputTokens) * BigInt(manifest.pricing.inputMicroUsdPerMillionTokens);
  const output =
    BigInt(usage.outputTokens) * BigInt(manifest.pricing.outputMicroUsdPerMillionTokens);
  const cost = (input + output + 999_999n) / 1_000_000n;
  if (cost > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("AI cost exceeds safe range.");
  return Number(cost);
}

export function maximumUiAiCostMicroUsd(
  manifest: UiAiProviderManifest,
  inputTokenLimit: number,
  outputTokenLimit: number
): number {
  return calculateUiAiCostMicroUsd(manifest, {
    inputTokens: inputTokenLimit,
    outputTokens: outputTokenLimit
  });
}

export function validUiAiBudget(budget: UiAiGenerationBudget): boolean {
  const positive = [
    budget.maximumCostMicroUsd,
    budget.maximumInputTokens,
    budget.maximumOutputTokens,
    budget.timeoutMs
  ].every(positiveInteger);
  return positive && validRetries(budget.maximumRetries) && budget.timeoutMs <= 120_000;
}

export function validUiAiUsage(value: unknown): value is UiAiTokenUsage {
  if (!record(value)) return false;
  const input = value["inputTokens"];
  const output = value["outputTokens"];
  const total = value["totalTokens"];
  if (![input, output, total].every(nonnegativeInteger)) return false;
  return Number(total) === Number(input) + Number(output);
}

function positiveInteger(value: unknown): value is number {
  return nonnegativeInteger(value) && value > 0;
}

function validRetries(value: unknown): value is number {
  return nonnegativeInteger(value) && value <= 2;
}

function nonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function record(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
