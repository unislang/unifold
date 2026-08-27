// @vitest-environment happy-dom
import { UnifoldApplicationMountStatus, mountUnifoldApplication } from "@unislang/unifold";
import { expect, it, vi } from "vitest";

import { commitUiPatchProposal } from "./commit.js";
import { canonicalJson } from "./fingerprint.js";
import { aiTestDocument, aiTestProposal } from "./proposal.test-data.js";
import { UiPatchApprovalStatus, UiPatchCommitStatus, UiPatchRisk } from "./types.js";

it("commits an accepted model proposal through the application coordinator", async () => {
  const container = document.createElement("div");
  const mounted = mountUnifoldApplication(aiTestDocument(), container);
  if (mounted.status !== UnifoldApplicationMountStatus.Mounted) {
    throw new Error("Expected the test application to mount.");
  }
  const result = await commitUiPatchProposal({
    application: mounted.application,
    proposal: await aiTestProposal()
  });
  expect(result.status).toBe(UiPatchCommitStatus.Applied);
  expect(mounted.application.document.documentRevision).toBe("2");
  expect(mounted.application.runtime.getSnapshot("name").properties).toMatchObject({
    label: "Full name"
  });
  expect(canonicalJson(mounted.application.authored)).toContain('"revision":"2"');
  mounted.application.dispose();
});

it("does not overwrite a live edit made during asynchronous evaluation", async () => {
  const original = aiTestDocument();
  const changed = { ...original, revision: "human-edit" };
  const update = vi.fn();
  let reads = 0;
  const application = {
    get authored() {
      reads += 1;
      return reads === 1 ? original : changed;
    },
    update
  };
  const result = await commitUiPatchProposal({
    application: application as never,
    proposal: await aiTestProposal()
  });
  expect(result.status).toBe(UiPatchCommitStatus.Rejected);
  expect(update).not.toHaveBeenCalled();
});

it("returns the explicit review state without updating consequential proposals", async () => {
  const update = vi.fn();
  const result = await commitUiPatchProposal({
    approval: UiPatchApprovalStatus.Pending,
    application: { authored: aiTestDocument(), update } as never,
    proposal: await aiTestProposal(UiPatchRisk.Behavior)
  });
  expect(result.status).toBe(UiPatchCommitStatus.ReviewRequired);
  expect(update).not.toHaveBeenCalled();
});

it("returns a rejection for a proposal targeting another revision", async () => {
  const update = vi.fn();
  const proposal = { ...(await aiTestProposal()), baseRevision: "outdated" };
  const result = await commitUiPatchProposal({
    application: { authored: aiTestDocument(), update } as never,
    proposal
  });
  expect(result.status).toBe(UiPatchCommitStatus.Rejected);
  expect(update).not.toHaveBeenCalled();
});
