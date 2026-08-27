import {
  evaluateUiPatchProposal,
  fingerprintJson,
  UiPatchApprovalStatus,
  UiPatchEvaluationStatus,
  type UiPatchEvaluationResult,
  type UiPatchProposal
} from "@unislang/unifold-ai";
import { UnifoldApplicationUpdateStatus } from "@unislang/unifold";
import { expect, it, vi } from "vitest";

import { studioDocument, studioProposal } from "./studio.test-data.js";
import { UnifoldStudioSession } from "./session.js";
import {
  StudioDiagnosticCode,
  StudioExportStatus,
  StudioSessionState,
  type StudioPreviewHandle,
  type StudioSessionOptions
} from "./types.js";

it("previews without live mutation, applies atomically, and exports deterministically", async () => {
  const harness = sessionHarness();
  const session = new UnifoldStudioSession(harness.options);
  const previewed = await session.request({ prompt: "Clarify the name label" });
  expect(previewed.state).toBe(StudioSessionState.PreviewReady);
  expect(previewed.diff?.operations.map(({ path }) => path)).toEqual([
    "/revision",
    "/view/$children/0/label"
  ]);
  expect(harness.application.authored).toEqual(studioDocument());
  expect(harness.open).toHaveBeenCalledOnce();

  const applied = await session.apply();
  expect(applied.state).toBe(StudioSessionState.Applied);
  expect(harness.application.authored).toEqual(studioDocument("2", "Full name"));
  expect(harness.dispose).toHaveBeenCalledOnce();
  const first = await session.export();
  const second = await session.export();
  expect(first.status).toBe(StudioExportStatus.Exported);
  expect(first).toEqual(second);
});

it("requires approval before opening a consequential candidate", async () => {
  const harness = sessionHarness([reviewRequired(), accepted()]);
  const session = new UnifoldStudioSession(harness.options);
  const review = await session.request({ prompt: "Change the behavior" });
  expect(review.state).toBe(StudioSessionState.ReviewRequired);
  expect(harness.open).not.toHaveBeenCalled();
  const preview = await session.approve();
  expect(preview.state).toBe(StudioSessionState.PreviewReady);
  expect(harness.evaluate).toHaveBeenLastCalledWith(
    expect.objectContaining({ approval: UiPatchApprovalStatus.Approved })
  );
});

it("supersedes slow proposals and disposes only the active preview", async () => {
  const slow = deferred<UiPatchProposal>();
  const harness = sessionHarness();
  harness.propose.mockImplementationOnce(() => slow.promise);
  harness.propose.mockResolvedValueOnce(studioProposal("newer"));
  const session = new UnifoldStudioSession(harness.options);
  const first = session.request({ prompt: "First" });
  const second = await session.request({ prompt: "Second" });
  slow.resolve(studioProposal("older"));
  await first;
  expect(second.proposal).toMatchObject({ proposalId: "newer" });
  expect(session.snapshot.proposal).toMatchObject({ proposalId: "newer" });
  expect(harness.open).toHaveBeenCalledOnce();
});

it("keeps export unavailable after cancellation or rejection", async () => {
  const harness = sessionHarness([rejected()]);
  const session = new UnifoldStudioSession(harness.options);
  const result = await session.request({ prompt: "Unsafe change" });
  expect(result.state).toBe(StudioSessionState.Failed);
  expect((await session.export()).status).toBe(StudioExportStatus.Unavailable);
  session.cancel();
  expect(session.snapshot.diagnostics).toContainEqual(
    expect.objectContaining({ code: StudioDiagnosticCode.Cancelled })
  );
});

it("revalidates the exact live base through the real guarded evaluator before apply", async () => {
  const harness = sessionHarness();
  const proposal = {
    ...studioProposal(),
    baseHash: await fingerprintJson(studioDocument())
  };
  harness.propose.mockResolvedValue(proposal);
  const session = new UnifoldStudioSession({
    ...harness.options,
    evaluator: { evaluate: evaluateUiPatchProposal }
  });
  expect((await session.request({ prompt: "Clarify" })).state).toBe(
    StudioSessionState.PreviewReady
  );
  harness.application.update(studioDocument("human-edit", "Preferred name"));
  const result = await session.apply();
  expect(result.state).toBe(StudioSessionState.Failed);
  expect(harness.application.authored).toEqual(studioDocument("human-edit", "Preferred name"));
});

it("fails safely when approval evaluation throws", async () => {
  const harness = sessionHarness([reviewRequired()]);
  const session = new UnifoldStudioSession(harness.options);
  await session.request({ prompt: "Change the behavior" });
  harness.evaluate.mockRejectedValueOnce(new Error("provider detail must not escape"));
  const result = await session.approve();
  expect(result.state).toBe(StudioSessionState.Failed);
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({ code: StudioDiagnosticCode.EvaluationFailed })
  );
});

it("fails safely when apply revalidation throws", async () => {
  const harness = sessionHarness();
  const session = new UnifoldStudioSession(harness.options);
  await session.request({ prompt: "Clarify" });
  harness.evaluate.mockRejectedValueOnce(new Error("provider detail must not escape"));
  const result = await session.apply();
  expect(result.state).toBe(StudioSessionState.Failed);
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({ code: StudioDiagnosticCode.EvaluationFailed })
  );
});

it("reports rejected underlying exports instead of contradictory success", async () => {
  const invalid = {
    candidate: { revision: "2" },
    diagnostics: [],
    status: UiPatchEvaluationStatus.Accepted
  };
  const harness = sessionHarness([invalid, invalid]);
  const session = new UnifoldStudioSession(harness.options);
  await session.request({ prompt: "Produce an invalid fake candidate" });
  await session.apply();
  const result = await session.export();
  expect(result.status).toBe(StudioExportStatus.Unavailable);
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({ code: StudioDiagnosticCode.ExportFailed })
  );
});

it("disposes the isolated preview when final revalidation rejects", async () => {
  const harness = sessionHarness([accepted(), rejected()]);
  const session = new UnifoldStudioSession(harness.options);
  await session.request({ prompt: "Clarify" });
  expect((await session.apply()).state).toBe(StudioSessionState.Failed);
  expect(harness.dispose).toHaveBeenCalledOnce();
});

it("rejects stale preview evidence when live state changes during generation", async () => {
  const proposal = deferred<UiPatchProposal>();
  const harness = sessionHarness();
  harness.propose.mockReturnValueOnce(proposal.promise);
  const session = new UnifoldStudioSession(harness.options);
  const request = session.request({ prompt: "Clarify" });
  harness.application.update(studioDocument("human-edit", "Preferred name"));
  proposal.resolve(studioProposal());
  const result = await request;
  expect(result.state).toBe(StudioSessionState.Failed);
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({ code: StudioDiagnosticCode.StaleResult })
  );
  expect(harness.open).not.toHaveBeenCalled();
});

it("does not overwrite a live edit made during final async evaluation", async () => {
  const harness = sessionHarness();
  const session = new UnifoldStudioSession(harness.options);
  await session.request({ prompt: "Clarify" });
  const evaluation = deferred<UiPatchEvaluationResult>();
  harness.evaluate.mockReturnValueOnce(evaluation.promise);
  const apply = session.apply();
  harness.application.update(studioDocument("human-edit", "Preferred name"));
  evaluation.resolve(accepted());
  const result = await apply;
  expect(result.state).toBe(StudioSessionState.Failed);
  expect(harness.application.authored).toEqual(studioDocument("human-edit", "Preferred name"));
});

function sessionHarness(evaluations: UiPatchEvaluationResult[] = [accepted(), accepted()]) {
  let authored = studioDocument();
  const dispose = vi.fn();
  const open = vi.fn<() => StudioPreviewHandle>(() => ({ dispose }));
  const propose = vi.fn(async () => studioProposal());
  const evaluate = vi.fn(async () => evaluations.shift() ?? accepted());
  const application = {
    get authored() {
      return structuredClone(authored);
    },
    update(candidate: unknown) {
      authored = structuredClone(candidate) as typeof authored;
      return { diagnostics: [], revision: 1, status: UnifoldApplicationUpdateStatus.Applied };
    }
  };
  const options: StudioSessionOptions = {
    application,
    evaluator: { evaluate },
    preview: { open },
    proposalClient: { propose }
  };
  return { application, dispose, evaluate, open, options, propose };
}

function accepted(): UiPatchEvaluationResult {
  return {
    candidate: studioDocument("2", "Full name"),
    diagnostics: [],
    status: UiPatchEvaluationStatus.Accepted
  };
}

function reviewRequired(): UiPatchEvaluationResult {
  return {
    diagnostics: [{ code: "approval-required" as never, message: "Review.", path: "/risk" }],
    status: UiPatchEvaluationStatus.ReviewRequired
  };
}

function rejected(): UiPatchEvaluationResult {
  return {
    diagnostics: [{ code: "forbidden-path" as never, message: "Rejected.", path: "/view/id" }],
    status: UiPatchEvaluationStatus.Rejected
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
