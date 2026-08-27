import { expect, it } from "vitest";

import { aiTestProposal } from "./proposal.test-data.js";
import { uiPatchProposalSchema } from "./schema.js";
import { MAXIMUM_AI_PATCH_OPERATIONS } from "./types.js";

it("accepts the bounded proposal contract", async () => {
  expect(uiPatchProposalSchema.safeParse(await aiTestProposal()).success).toBe(true);
});

it("rejects undeclared proposal properties", async () => {
  const proposal = { ...(await aiTestProposal()), executableCode: "alert(1)" };
  expect(uiPatchProposalSchema.safeParse(proposal).success).toBe(false);
});

it("rejects operations above the advertised context limit", async () => {
  const proposal = await aiTestProposal();
  const operation = proposal.operations[0];
  if (operation === undefined) throw new Error("Missing operation fixture.");
  const operations = Array.from({ length: MAXIMUM_AI_PATCH_OPERATIONS + 1 }, () => operation);
  expect(uiPatchProposalSchema.safeParse({ ...proposal, operations }).success).toBe(false);
});

it("rejects unregistered requested checks", async () => {
  const proposal = { ...(await aiTestProposal()), requestedChecks: ["invented-check"] };
  expect(uiPatchProposalSchema.safeParse(proposal).success).toBe(false);
});
