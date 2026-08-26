import { expect, it } from "vitest";

import { aiTestProposal } from "./proposal.test-data.js";
import { uiPatchProposalSchema } from "./schema.js";

it("accepts the bounded proposal contract", async () => {
  expect(uiPatchProposalSchema.safeParse(await aiTestProposal()).success).toBe(true);
});

it("rejects undeclared proposal properties", async () => {
  const proposal = { ...(await aiTestProposal()), executableCode: "alert(1)" };
  expect(uiPatchProposalSchema.safeParse(proposal).success).toBe(false);
});
