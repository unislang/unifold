import { expect, it, vi } from "vitest";

import { afterDocument, replayPlan } from "./devtools.test-data.js";
import { replayDocument } from "./replay.js";
import { DevtoolsReplayStatus } from "./types.js";

it("replays deterministic data-only frames to an immutable document", async () => {
  const plan = await replayPlan();
  const validation = { validate: vi.fn(() => []) };
  const result = await replayDocument(plan, validation);
  expect(result).toMatchObject({
    appliedFrames: 1,
    diagnostics: [],
    document: afterDocument,
    status: DevtoolsReplayStatus.Succeeded
  });
  expect(validation.validate).toHaveBeenCalledTimes(1);
  expect(Object.isFrozen(result.document)).toBe(true);
  expect(Object.isFrozen(result.document?.["view"])).toBe(true);
});

it("reports malformed plans, divergence, and host validation failures", async () => {
  const plan = await replayPlan();
  const valid = { validate: () => [] };
  await expect(
    replayDocument({ ...plan, protocolVersion: "future" }, valid)
  ).resolves.toMatchObject({
    appliedFrames: 0,
    status: DevtoolsReplayStatus.Invalid
  });
  await expect(replayDocument(withFrame(plan, { sequence: 2 }), valid)).resolves.toMatchObject({
    appliedFrames: 0,
    diagnostics: ["replay.sequence"],
    status: DevtoolsReplayStatus.Diverged
  });
  await expect(
    replayDocument(plan, { validate: () => ["document.invalid"] })
  ).resolves.toMatchObject({
    appliedFrames: 0,
    diagnostics: ["document.invalid"],
    status: DevtoolsReplayStatus.Invalid
  });
});

it("reports base, patch, and resulting-fingerprint divergence", verifyDivergenceModes);

it("freezes nested arrays and accepts an empty deterministic replay", async () => {
  const plan = await replayPlan();
  const empty = { ...plan, frames: [], initialDocument: { values: [{ id: "one" }] } };
  const result = await replayDocument(empty, { validate: () => [] });
  expect(result.status).toBe(DevtoolsReplayStatus.Succeeded);
  expect(Object.isFrozen(result.document?.["values"])).toBe(true);
  expect(Object.isFrozen((result.document?.["values"] as object[])[0])).toBe(true);
});

async function verifyDivergenceModes(): Promise<void> {
  const plan = await replayPlan();
  const valid = { validate: () => [] };
  const wrong = "0".repeat(64);
  await expect(
    replayDocument(withFrame(plan, { baseFingerprint: wrong }), valid)
  ).resolves.toMatchObject({
    diagnostics: ["replay.base"],
    status: DevtoolsReplayStatus.Diverged
  });
  await expect(
    replayDocument(withFrame(plan, { operations: [{ op: "remove", path: "/missing" }] }), valid)
  ).resolves.toMatchObject({
    diagnostics: ["replay.patch"],
    status: DevtoolsReplayStatus.Diverged
  });
  await expect(
    replayDocument(withFrame(plan, { expectedFingerprint: wrong }), valid)
  ).resolves.toMatchObject({
    diagnostics: ["replay.fingerprint"],
    status: DevtoolsReplayStatus.Diverged
  });
}

function withFrame(plan: Awaited<ReturnType<typeof replayPlan>>, frame: object) {
  return { ...plan, frames: [{ ...plan.frames[0], ...frame }] };
}
