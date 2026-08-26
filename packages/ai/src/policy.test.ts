import { expect, it } from "vitest";

import { aiTestProposal } from "./proposal.test-data.js";
import { proposalPolicyDiagnostics } from "./policy.js";
import {
  JsonPatchOperationType,
  UiPatchApprovalStatus,
  UiPatchDiagnosticCode,
  UiPatchRisk
} from "./types.js";

it("requires review for behavior proposals", async () => {
  const proposal = await aiTestProposal(UiPatchRisk.Behavior);
  expect(diagnosticCodes(proposalPolicyDiagnostics(proposal, "1", proposal.baseHash))).toContain(
    UiPatchDiagnosticCode.ApprovalRequired
  );
});

it("rejects stable-ID and prototype paths", async () => {
  const proposal = await aiTestProposal();
  const operations = [
    ...proposal.operations,
    { op: JsonPatchOperationType.Replace, path: "/view/id", value: "changed" },
    { op: JsonPatchOperationType.Add, path: "/view/__proto__/unsafe", value: true }
  ];
  const diagnostics = proposalPolicyDiagnostics(
    { ...proposal, operations },
    "1",
    proposal.baseHash,
    UiPatchApprovalStatus.Approved
  );
  expect(diagnosticCodes(diagnostics)).toEqual(
    expect.arrayContaining([
      UiPatchDiagnosticCode.ForbiddenPath,
      UiPatchDiagnosticCode.ForbiddenPath
    ])
  );
});

function diagnosticCodes(diagnostics: readonly { readonly code: UiPatchDiagnosticCode }[]) {
  return diagnostics.map((item) => item.code);
}
