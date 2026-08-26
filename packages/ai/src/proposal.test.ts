import { expect, it } from "vitest";

import { aiTestDocument, aiTestProposal } from "./proposal.test-data.js";
import { evaluateUiPatchProposal } from "./proposal.js";
import {
  JsonPatchOperationType,
  UiPatchApprovalStatus,
  UiPatchDiagnosticCode,
  UiPatchEvaluationStatus,
  UiPatchRisk
} from "./types.js";

it("accepts a safe candidate only after patching and compilation", async () => {
  const result = await evaluateUiPatchProposal({
    document: aiTestDocument(),
    proposal: await aiTestProposal()
  });
  expect(result.status).toBe(UiPatchEvaluationStatus.Accepted);
  expect(result.candidate).toMatchObject({
    revision: "2",
    view: { $children: [{ label: "Full name" }] }
  });
});

it("holds consequential proposals for explicit approval", async () => {
  const proposal = await aiTestProposal(UiPatchRisk.Behavior);
  const pending = await evaluateUiPatchProposal({ document: aiTestDocument(), proposal });
  expect(pending.status).toBe(UiPatchEvaluationStatus.ReviewRequired);
  const approved = await evaluateUiPatchProposal({
    approval: UiPatchApprovalStatus.Approved,
    document: aiTestDocument(),
    proposal
  });
  expect(approved.status).toBe(UiPatchEvaluationStatus.Accepted);
});

it("rejects stale, unsafe, and compiler-invalid proposals", async () => {
  const proposal = await aiTestProposal();
  await expectCode(
    { ...proposal, baseRevision: "stale" },
    UiPatchDiagnosticCode.BaseRevisionMismatch
  );
  await expectCode(unsafeProposal(proposal), UiPatchDiagnosticCode.ForbiddenPath);
  await expectCode(invalidComponentProposal(proposal), UiPatchDiagnosticCode.CompilationFailed);
});

async function expectCode(proposal: unknown, code: UiPatchDiagnosticCode): Promise<void> {
  const result = await evaluateUiPatchProposal({ document: aiTestDocument(), proposal });
  expect(result.status).toBe(UiPatchEvaluationStatus.Rejected);
  expect(result.diagnostics.map((item) => item.code)).toContain(code);
}

function unsafeProposal(proposal: Awaited<ReturnType<typeof aiTestProposal>>) {
  return {
    ...proposal,
    operations: [
      ...proposal.operations,
      { op: JsonPatchOperationType.Replace, path: "/view/id", value: "unsafe" }
    ]
  };
}

function invalidComponentProposal(proposal: Awaited<ReturnType<typeof aiTestProposal>>) {
  return {
    ...proposal,
    operations: [
      ...proposal.operations,
      {
        op: JsonPatchOperationType.Replace,
        path: "/view/$children/0/$comp",
        value: "UnknownComponent"
      }
    ]
  };
}
