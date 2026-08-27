import { expect, it } from "vitest";

import {
  calculateUiAiCostMicroUsd,
  maximumUiAiCostMicroUsd,
  validUiAiBudget,
  validUiAiUsage
} from "./budget.js";
import { manifestFixture } from "./governance.test-data.js";

it("calculates deterministic integer micro-USD token costs", async () => {
  const { signedManifest } = await manifestFixture();
  expect(
    calculateUiAiCostMicroUsd(signedManifest.manifest, {
      inputTokens: 1_000,
      outputTokens: 500
    })
  ).toBe(6_000);
  expect(maximumUiAiCostMicroUsd(signedManifest.manifest, 1_000, 500)).toBe(6_000);
});

it("uses exact integer arithmetic before rounding micro-USD", async () => {
  const { signedManifest } = await manifestFixture({
    pricing: {
      ...(await manifestFixture()).signedManifest.manifest.pricing,
      inputMicroUsdPerMillionTokens: 1_000_000_000,
      outputMicroUsdPerMillionTokens: 1_000_000_000
    }
  });
  expect(
    calculateUiAiCostMicroUsd(signedManifest.manifest, {
      inputTokens: 9_000_001,
      outputTokens: 999_999
    })
  ).toBe(10_000_000_000);
});

it.each([
  [
    {
      maximumCostMicroUsd: 1,
      maximumInputTokens: 1,
      maximumOutputTokens: 1,
      maximumRetries: 0,
      timeoutMs: 1
    },
    true
  ],
  [
    {
      maximumCostMicroUsd: 0,
      maximumInputTokens: 1,
      maximumOutputTokens: 1,
      maximumRetries: 0,
      timeoutMs: 1
    },
    false
  ],
  [
    {
      maximumCostMicroUsd: 1,
      maximumInputTokens: 1,
      maximumOutputTokens: 1,
      maximumRetries: 3,
      timeoutMs: 1
    },
    false
  ],
  [
    {
      maximumCostMicroUsd: 1,
      maximumInputTokens: 1,
      maximumOutputTokens: 1,
      maximumRetries: 0,
      timeoutMs: 120_001
    },
    false
  ]
])("validates the complete bounded generation policy", (budget, expected) => {
  expect(validUiAiBudget(budget)).toBe(expected);
});

it("accepts only complete, internally consistent normalized usage", () => {
  expect(validUiAiUsage({ inputTokens: 4, outputTokens: 2, totalTokens: 6 })).toBe(true);
  expect(validUiAiUsage({ inputTokens: 4, outputTokens: 2, totalTokens: 5 })).toBe(false);
  expect(validUiAiUsage({ inputTokens: undefined, outputTokens: 2, totalTokens: 2 })).toBe(false);
  expect(validUiAiUsage({ inputTokens: -1, outputTokens: 2, totalTokens: 1 })).toBe(false);
});
