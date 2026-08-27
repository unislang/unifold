import { DataClassification } from "@unislang/unifold-contracts";
import { customProvider } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { expect, it, vi } from "vitest";

import {
  UiAiBudgetReservationStatus,
  UiAiBudgetSettlementOutcome,
  type UiAiBudgetLedger
} from "./budget.js";
import { generateGovernedUiPatchProposal } from "./governed-generation.js";
import {
  UiAiGovernedDiagnosticCode,
  UiAiGovernedGenerationStatus,
  type GenerateGovernedUiPatchProposalOptions
} from "./governed-generation-types.js";
import { manifestFixture } from "./governance.test-data.js";
import {
  UiAiProviderRegistryStatus,
  createUiAiProviderRouteRegistry
} from "./provider-registry.js";
import {
  aiTestComponentDefinitions,
  aiTestDocument,
  aiTestProposal
} from "./proposal.test-data.js";

it("routes, budgets, generates, settles, and returns a safe usage receipt", async () => {
  const harness = await generationHarness();
  const result = await generateGovernedUiPatchProposal(harness.options);
  expect(result.status).toBe(UiAiGovernedGenerationStatus.Succeeded);
  if (result.status !== UiAiGovernedGenerationStatus.Succeeded) return;
  expect(result.proposal).toEqual(await aiTestProposal());
  expect(result.receipt).toMatchObject({
    costMicroUsd: 24,
    manifestId: "proposal-manifest",
    modelId: "proposal-v1",
    providerId: "mock",
    retryLimit: 0,
    signatureKeyId: "test-key",
    usage: { inputTokens: 8, outputTokens: 1, totalTokens: 9 }
  });
  expect(harness.reserve).toHaveBeenCalledWith(expect.objectContaining({ inputTokenLimit: 100 }));
  expect(harness.settle).toHaveBeenCalledWith(
    expect.objectContaining({ outcome: UiAiBudgetSettlementOutcome.Completed })
  );
  expect(harness.model.doGenerateCalls[0]).toMatchObject({ maxOutputTokens: 100 });
  expect(harness.model.doGenerateCalls[0]?.abortSignal).toBeInstanceOf(AbortSignal);
});

it.each([
  [
    "invalid policy",
    { budget: { maximumCostMicroUsd: 0 } },
    UiAiGovernedDiagnosticCode.InvalidPolicy
  ],
  [
    "invalid trace context",
    { traceId: "not-a-w3c-trace" },
    UiAiGovernedDiagnosticCode.InvalidRequestContext
  ],
  [
    "zero trace context",
    { traceId: "00000000000000000000000000000000" },
    UiAiGovernedDiagnosticCode.InvalidRequestContext
  ],
  ["empty request identity", { requestId: "" }, UiAiGovernedDiagnosticCode.InvalidRequestContext],
  [
    "oversized tenant identity",
    { tenantId: "t".repeat(129) },
    UiAiGovernedDiagnosticCode.InvalidRequestContext
  ],
  [
    "unsafe user identity",
    { userId: "user with spaces" },
    UiAiGovernedDiagnosticCode.InvalidRequestContext
  ],
  ["invalid region", { region: "US Central" }, UiAiGovernedDiagnosticCode.InvalidRequestContext],
  ["unknown route", { routeId: "missing" }, UiAiGovernedDiagnosticCode.ProviderRejected],
  [
    "denied classification",
    { classification: DataClassification.Confidential },
    UiAiGovernedDiagnosticCode.ProviderRejected
  ]
])("rejects %s before provider I/O", async (_label, override, expected) => {
  const harness = await generationHarness();
  const options = optionOverride(harness.options, override);
  const result = await generateGovernedUiPatchProposal(options);
  expect(diagnosticCode(result)).toBe(expected);
  expect(harness.model.doGenerateCalls).toHaveLength(0);
  expect(harness.reserve).not.toHaveBeenCalled();
});

it("rejects token, model-output, and cost limits before reservation", async () => {
  const input = await generationHarness({ estimate: 10_001 });
  expect(diagnosticCode(await generateGovernedUiPatchProposal(input.options))).toBe(
    UiAiGovernedDiagnosticCode.InvalidPolicy
  );
  const output = await generationHarness();
  output.options = optionOverride(output.options, { budget: { maximumOutputTokens: 1_001 } });
  expect(diagnosticCode(await generateGovernedUiPatchProposal(output.options))).toBe(
    UiAiGovernedDiagnosticCode.InvalidPolicy
  );
  const cost = await generationHarness();
  cost.options = optionOverride(cost.options, { budget: { maximumCostMicroUsd: 1 } });
  expect(diagnosticCode(await generateGovernedUiPatchProposal(cost.options))).toBe(
    UiAiGovernedDiagnosticCode.InvalidPolicy
  );
  expect(input.reserve).not.toHaveBeenCalled();
  expect(output.reserve).not.toHaveBeenCalled();
  expect(cost.reserve).not.toHaveBeenCalled();
});

it("contains estimator and ledger denial without invoking the model", async () => {
  const estimator = await generationHarness({ estimateError: true });
  expect(diagnosticCode(await generateGovernedUiPatchProposal(estimator.options))).toBe(
    UiAiGovernedDiagnosticCode.TokenEstimateFailed
  );
  const denied = await generationHarness({ reserve: false });
  expect(diagnosticCode(await generateGovernedUiPatchProposal(denied.options))).toBe(
    UiAiGovernedDiagnosticCode.BudgetDenied
  );
  expect(estimator.model.doGenerateCalls).toHaveLength(0);
  expect(denied.model.doGenerateCalls).toHaveLength(0);
  const failed = await generationHarness({ reserveError: true });
  expect(diagnosticCode(await generateGovernedUiPatchProposal(failed.options))).toBe(
    UiAiGovernedDiagnosticCode.BudgetReservationFailed
  );
  expect(failed.model.doGenerateCalls).toHaveLength(0);
});

it("rejects missing usage, token overrun, and failed settlement", async () => {
  const missing = await generationHarness({ inputTokens: undefined });
  expect(diagnosticCode(await generateGovernedUiPatchProposal(missing.options))).toBe(
    UiAiGovernedDiagnosticCode.UsageInvalid
  );
  const overrun = await generationHarness({ estimate: 1, inputTokens: 8 });
  expect(diagnosticCode(await generateGovernedUiPatchProposal(overrun.options))).toBe(
    UiAiGovernedDiagnosticCode.BudgetOverrun
  );
  expect(overrun.settle).toHaveBeenCalledWith(
    expect.objectContaining({ outcome: UiAiBudgetSettlementOutcome.Overrun })
  );
  const settlement = await generationHarness({ settleError: true });
  expect(diagnosticCode(await generateGovernedUiPatchProposal(settlement.options))).toBe(
    UiAiGovernedDiagnosticCode.BudgetSettlementFailed
  );
});

it("redacts provider failures and settles the reservation", async () => {
  const harness = await generationHarness({ providerError: new Error("secret provider detail") });
  const result = await generateGovernedUiPatchProposal(harness.options);
  expect(result.diagnostics).toEqual([
    {
      code: UiAiGovernedDiagnosticCode.ProviderFailed,
      message: "Governed generation rejected: provider-failed."
    }
  ]);
  expect(JSON.stringify(result)).not.toContain("secret provider detail");
  expect(harness.settle).toHaveBeenCalledWith(
    expect.objectContaining({ outcome: UiAiBudgetSettlementOutcome.Failed })
  );
  expect(harness.model.doGenerateCalls).toHaveLength(1);
});

interface HarnessOverrides {
  readonly estimate?: number;
  readonly estimateError?: boolean;
  readonly inputTokens?: number | undefined;
  readonly providerError?: Error;
  readonly reserve?: boolean;
  readonly reserveError?: boolean;
  readonly settleError?: boolean;
}

async function generationHarness(overrides: HarnessOverrides = {}) {
  const proposal = await aiTestProposal();
  const model = proposalModel(proposal, overrides);
  const registry = await testRegistry(model);
  const { ledger, reserve, settle } = ledgerHarness(overrides);
  const options = generationOptions(registry, ledger, estimator(overrides));
  return { model, options, reserve, settle };
}

async function testRegistry(model: MockLanguageModelV4) {
  const fixture = await manifestFixture();
  const registryResult = await createUiAiProviderRouteRegistry({
    clock: () => fixture.options.nowEpochMs,
    providers: { mock: customProvider({ languageModels: { "proposal-v1": model } }) },
    routes: [{ routeId: "proposal", signedManifest: fixture.signedManifest }],
    trustedKeys: fixture.keys
  });
  if (registryResult.status !== UiAiProviderRegistryStatus.Ready) throw new Error("fixture failed");
  return registryResult.registry;
}

function ledgerHarness(overrides: HarnessOverrides) {
  const reserve = vi.fn(async () => {
    if (overrides.reserveError === true) throw new Error("ledger reservation detail");
    return reservationResult(overrides.reserve);
  });
  const settle = vi.fn(async () => {
    if (overrides.settleError === true) throw new Error("ledger detail");
  });
  const ledger: UiAiBudgetLedger = { reserve, settle };
  return { ledger, reserve, settle };
}

function reservationResult(reserved: boolean | undefined) {
  return reserved === false
    ? { status: UiAiBudgetReservationStatus.Denied as const }
    : {
        reservation: { reservationId: "reservation-1" },
        status: UiAiBudgetReservationStatus.Reserved as const
      };
}

function estimator(overrides: HarnessOverrides) {
  return {
    async estimateUpperBoundTokens() {
      if (overrides.estimateError === true) throw new Error("tokenizer detail");
      return overrides.estimate ?? 100;
    }
  };
}

function generationOptions(
  registry: GenerateGovernedUiPatchProposalOptions["registry"],
  ledger: UiAiBudgetLedger,
  estimatorValue: GenerateGovernedUiPatchProposalOptions["estimator"]
): GenerateGovernedUiPatchProposalOptions {
  const options: GenerateGovernedUiPatchProposalOptions = {
    budget: {
      maximumCostMicroUsd: 10_000,
      maximumInputTokens: 1_000,
      maximumOutputTokens: 100,
      maximumRetries: 0,
      timeoutMs: 1_000
    },
    classification: DataClassification.Internal,
    componentDefinitions: aiTestComponentDefinitions(),
    document: aiTestDocument(),
    estimator: estimatorValue,
    ledger,
    prompt: "Rename the field.",
    region: "us-central",
    registry,
    requestId: "request-1",
    routeId: "proposal",
    tenantId: "tenant-1",
    traceId: "0123456789abcdef0123456789abcdef",
    userId: "user-1"
  };
  return options;
}

function proposalModel(proposal: unknown, overrides: HarnessOverrides): MockLanguageModelV4 {
  const inputTokens = "inputTokens" in overrides ? overrides.inputTokens : 8;
  const doGenerate =
    overrides.providerError === undefined
      ? {
          content: [{ text: JSON.stringify(proposal), type: "text" as const }],
          finishReason: { raw: "stop", unified: "stop" as const },
          usage: {
            inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: inputTokens, total: inputTokens },
            outputTokens: { reasoning: 0, text: 1, total: 1 }
          },
          warnings: []
        }
      : async () => Promise.reject(overrides.providerError);
  return new MockLanguageModelV4({ doGenerate });
}

function optionOverride(
  options: GenerateGovernedUiPatchProposalOptions,
  override: Record<string, unknown>
): GenerateGovernedUiPatchProposalOptions {
  const budget =
    "budget" in override
      ? { ...options.budget, ...(override["budget"] as object) }
      : options.budget;
  return { ...options, ...override, budget } as GenerateGovernedUiPatchProposalOptions;
}

function diagnosticCode(result: { readonly diagnostics: readonly { readonly code: string }[] }) {
  return result.diagnostics.at(0)?.code;
}
