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

it("requires review when the model underclassifies framework-derived risk", async () => {
  const proposal = await aiTestProposal(UiPatchRisk.Presentation);
  for (const path of [
    "/view/$children/0/required",
    "/view/$children/0/value",
    "/view/$children/0/href"
  ]) {
    const operations = [
      ...proposal.operations,
      { op: JsonPatchOperationType.Add, path, value: "underclassified" }
    ];
    const diagnostics = proposalPolicyDiagnostics(
      { ...proposal, operations },
      "1",
      proposal.baseHash
    );
    expect(diagnosticCodes(diagnostics)).toContain(UiPatchDiagnosticCode.ApprovalRequired);
  }
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

it("allows only add when creating the optional semantics root", async () => {
  const proposal = await aiTestProposal(UiPatchRisk.Data);
  const add = { op: JsonPatchOperationType.Add, path: "/semantics", value: {} } as const;
  const replace = { ...add, op: JsonPatchOperationType.Replace };
  expect(
    diagnosticCodes(
      proposalPolicyDiagnostics(
        { ...proposal, operations: [...proposal.operations, add] },
        "1",
        proposal.baseHash,
        UiPatchApprovalStatus.Approved
      )
    )
  ).not.toContain(UiPatchDiagnosticCode.ForbiddenPath);
  expect(
    diagnosticCodes(
      proposalPolicyDiagnostics(
        { ...proposal, operations: [...proposal.operations, replace] },
        "1",
        proposal.baseHash,
        UiPatchApprovalStatus.Approved
      )
    )
  ).toContain(UiPatchDiagnosticCode.ForbiddenPath);
});

function diagnosticCodes(diagnostics: readonly { readonly code: UiPatchDiagnosticCode }[]) {
  return diagnostics.map((item) => item.code);
}
