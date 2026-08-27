import { expect, it } from "vitest";

import {
  UiAiGovernedDiagnosticCode,
  UiAiGovernedGenerationStatus
} from "./governed-generation-types.js";

it("defines closed governed generation outcomes and diagnostics", () => {
  expect(Object.values(UiAiGovernedGenerationStatus)).toEqual(["rejected", "succeeded"]);
  expect(UiAiGovernedDiagnosticCode.BudgetReservationFailed).toBe("budget-reservation-failed");
  expect(UiAiGovernedDiagnosticCode.ProviderFailed).toBe("provider-failed");
});
