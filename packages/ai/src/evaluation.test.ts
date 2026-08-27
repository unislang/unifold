import { expect, it } from "vitest";

import {
  evaluateUiPatchProposal,
  UiPatchApprovalStatus,
  UiPatchEvaluationStatus,
  UiPatchRequestedCheck
} from "./evaluation.js";

it("exports proposal evaluation without the provider generation entry", () => {
  expect(evaluateUiPatchProposal).toBeTypeOf("function");
  expect(UiPatchApprovalStatus.Approved).toBe("approved");
  expect(UiPatchEvaluationStatus.Accepted).toBe("accepted");
  expect(UiPatchRequestedCheck.StaticExport).toBe("static-export");
});
