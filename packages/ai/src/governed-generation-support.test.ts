import { expect, it } from "vitest";

import { UiAiGovernedDiagnosticCode } from "./governed-generation-types.js";
import {
  normalizedUiAiUsage,
  providerFailureDiagnosticCode
} from "./governed-generation-support.js";

it("normalizes only complete finite provider usage", () => {
  expect(normalizedUiAiUsage({ inputTokens: 3, outputTokens: 2 })).toEqual({
    inputTokens: 3,
    outputTokens: 2,
    totalTokens: 5
  });
  expect(normalizedUiAiUsage({ inputTokens: undefined, outputTokens: 2 })).toBeUndefined();
  expect(normalizedUiAiUsage({ inputTokens: Number.NaN, outputTokens: 2 })).toBeUndefined();
});

it("maps cancellation, timeout, and provider failure to stable diagnostics", () => {
  const controller = new AbortController();
  controller.abort();
  expect(providerFailureDiagnosticCode(controller.signal, new Error("secret"))).toBe(
    UiAiGovernedDiagnosticCode.Cancelled
  );
  expect(providerFailureDiagnosticCode(undefined, new DOMException("secret", "TimeoutError"))).toBe(
    UiAiGovernedDiagnosticCode.TimedOut
  );
  expect(providerFailureDiagnosticCode(undefined, new Error("secret"))).toBe(
    UiAiGovernedDiagnosticCode.ProviderFailed
  );
});
