import {
  UiPatchDiagnosticCode,
  UiPatchEvaluationStatus,
  evaluateUiPatchProposal
} from "@unislang/unifold-ai/evaluation";
import { fingerprintJson } from "@unislang/unifold-export";
import { expect, it } from "vitest";

import { liveApplicationDocument } from "./documents.js";
import { LocalMockPrompt, LocalMockProposalClient } from "./local-mock-proposal.js";

it("creates a deterministic policy-valid proposal from the local prompt", async () => {
  const document = liveApplicationDocument();
  const client = new LocalMockProposalClient();
  const first = await client.propose(request(document, "  Make   it welcoming  "));
  const second = await client.propose(request(document, "Make it welcoming"));
  expect(first).toEqual(second);
  expect(first.baseHash).toBe(await fingerprintJson(document));
  const evaluation = await evaluateUiPatchProposal({ document, proposal: first });
  expect(evaluation.diagnostics).toEqual([]);
  expect(evaluation.status).toBe(UiPatchEvaluationStatus.Accepted);
  expect(JSON.stringify(evaluation.candidate)).toContain("Local mock request: Make it welcoming");
});

it("honors cancellation without contacting a provider", async () => {
  const controller = new AbortController();
  controller.abort();
  const client = new LocalMockProposalClient();
  await expect(
    client.propose(request(liveApplicationDocument(), "Change it", controller))
  ).rejects.toMatchObject({ name: "AbortError" });
});

it("aborts a delayed proposal before it can produce a candidate", async () => {
  const controller = new AbortController();
  const pending = new LocalMockProposalClient().propose(
    request(liveApplicationDocument(), LocalMockPrompt.Delayed, controller)
  );
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
});

it("produces an unsafe identity proposal only for governed rejection evidence", async () => {
  const document = liveApplicationDocument();
  const proposal = await new LocalMockProposalClient().propose(
    request(document, LocalMockPrompt.RejectStableIdentity)
  );
  const evaluation = await evaluateUiPatchProposal({ document, proposal });
  expect(evaluation.status).toBe(UiPatchEvaluationStatus.Rejected);
  expect(evaluation.diagnostics.map(({ code }) => code)).toContain(
    UiPatchDiagnosticCode.ForbiddenPath
  );
});

function request(document: unknown, prompt: string, controller = new AbortController()) {
  return { document, prompt, signal: controller.signal };
}
