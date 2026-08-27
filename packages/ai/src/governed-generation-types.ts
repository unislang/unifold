import type { DataClassification } from "@unislang/unifold-contracts";

import type {
  UiAiBudgetLedger,
  UiAiGenerationBudget,
  UiAiTokenUpperBoundEstimator,
  UiAiTokenUsage
} from "./budget.js";
import type { UiAiProviderRouteRegistry } from "./provider-registry.js";
import type { GenerateUiPatchProposalOptions, UiPatchProposal } from "./types.js";

export enum UiAiGovernedGenerationStatus {
  Rejected = "rejected",
  Succeeded = "succeeded"
}

export enum UiAiGovernedDiagnosticCode {
  BudgetDenied = "budget-denied",
  BudgetOverrun = "budget-overrun",
  BudgetReservationFailed = "budget-reservation-failed",
  BudgetSettlementFailed = "budget-settlement-failed",
  Cancelled = "cancelled",
  ContextRejected = "context-rejected",
  InvalidPolicy = "invalid-policy",
  InvalidRequestContext = "invalid-request-context",
  ProviderFailed = "provider-failed",
  ProviderRejected = "provider-rejected",
  TimedOut = "timed-out",
  TokenEstimateFailed = "token-estimate-failed",
  UsageInvalid = "usage-invalid"
}

export interface UiAiGovernedDiagnostic {
  readonly code: UiAiGovernedDiagnosticCode;
  readonly message: string;
}

export interface UiAiGenerationReceipt {
  readonly costMicroUsd: number;
  readonly durationMs: number;
  readonly manifestId: string;
  readonly modelId: string;
  readonly policyVersion: string;
  readonly promptVersion: string;
  readonly providerId: string;
  readonly requestId: string;
  readonly retryLimit: number;
  readonly routeId: string;
  readonly signatureKeyId: string;
  readonly timeoutMs: number;
  readonly traceId: string;
  readonly usage: UiAiTokenUsage;
}

export interface GenerateGovernedUiPatchProposalOptions
  extends Omit<GenerateUiPatchProposalOptions, "model"> {
  readonly budget: UiAiGenerationBudget;
  readonly classification: DataClassification;
  readonly clock?: () => number;
  readonly estimator: UiAiTokenUpperBoundEstimator;
  readonly ledger: UiAiBudgetLedger;
  readonly region: string;
  readonly registry: UiAiProviderRouteRegistry;
  readonly requestId: string;
  readonly routeId: string;
  readonly tenantId: string;
  readonly traceId: string;
  readonly userId: string;
}

export type UiAiGovernedGenerationResult =
  | {
      readonly diagnostics: readonly [];
      readonly proposal: UiPatchProposal;
      readonly receipt: UiAiGenerationReceipt;
      readonly status: UiAiGovernedGenerationStatus.Succeeded;
    }
  | {
      readonly diagnostics: readonly UiAiGovernedDiagnostic[];
      readonly status: UiAiGovernedGenerationStatus.Rejected;
    };
