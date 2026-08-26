// @vitest-environment happy-dom
import { UnifoldApplicationMountStatus, mountUnifoldApplication } from "@unislang/unifold";
import { expect, it } from "vitest";

import { commitUiPatchProposal } from "./commit.js";
import { canonicalJson } from "./fingerprint.js";
import { aiTestDocument, aiTestProposal } from "./proposal.test-data.js";
import { UiPatchCommitStatus } from "./types.js";

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
