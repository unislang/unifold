import { expect, it } from "vitest";

import { replayPlan } from "./devtools.test-data.js";
import { devtoolsReplayPlanErrors, isDevtoolsReplayPlan } from "./validation.js";

it("accepts exact bounded replay plans", async () => {
  const plan = await replayPlan();
  expect(isDevtoolsReplayPlan(plan)).toBe(true);
  expect(devtoolsReplayPlanErrors(plan)).toEqual([]);
});

it("rejects malformed fingerprints, authority, pointers, and unbounded JSON", async () => {
  const plan = await replayPlan();
  expect(isDevtoolsReplayPlan({ ...plan, actorId: "forged" })).toBe(false);
  expect(isDevtoolsReplayPlan(withFrame(plan, { baseFingerprint: "not-a-hash" }))).toBe(false);
  expect(isDevtoolsReplayPlan(withOperation(plan, { op: "remove", path: "/__proto__/x" }))).toBe(
    false
  );
  expect(
    isDevtoolsReplayPlan({ ...plan, initialDocument: { values: Array(20_001).fill(0) } })
  ).toBe(false);
});

it("accepts every supported exact JSON Patch operation shape", async () => {
  const plan = await replayPlan();
  const operations = [
    { op: "add", path: "/new", value: null },
    { from: "/id", op: "copy", path: "/copied" },
    { from: "/id", op: "move", path: "/moved" },
    { op: "remove", path: "/revision" },
    { op: "replace", path: "/id", value: "changed" },
    { op: "test", path: "/id", value: "document-1" }
  ];
  expect(
    operations.every((operation) => isDevtoolsReplayPlan(withOperation(plan, operation)))
  ).toBe(true);
});

it("rejects malformed frame and operation collections", async () => {
  const plan = await replayPlan();
  const candidates = [
    null,
    { ...plan, frames: "frames" },
    { ...plan, frames: Array(10_001).fill(plan.frames[0]) },
    { ...plan, frames: [null] },
    withFrame(plan, { sequence: 0 }),
    withFrame(plan, { operations: "operations" }),
    withFrame(plan, { operations: Array(257).fill({ op: "remove", path: "/id" }) }),
    withFrame(plan, { operations: [null] }),
    withOperation(plan, { op: "unknown", path: "/id" })
  ];
  expect(candidates.every((candidate) => !isDevtoolsReplayPlan(candidate))).toBe(true);
});

it("rejects unsafe pointers and non-JSON document values", async () => {
  const plan = await replayPlan();
  const pointers = ["", "relative", "/bad~2token", `/${"x".repeat(1_024)}`];
  expect(
    pointers.every((path) => !isDevtoolsReplayPlan(withOperation(plan, { op: "remove", path })))
  ).toBe(true);
  expect(isDevtoolsReplayPlan({ ...plan, initialDocument: { value: Number.NaN } })).toBe(false);
  expect(isDevtoolsReplayPlan({ ...plan, initialDocument: { constructor: "unsafe" } })).toBe(false);
  expect(isDevtoolsReplayPlan({ ...plan, initialDocument: deepDocument() })).toBe(false);
  expect(
    isDevtoolsReplayPlan({ ...plan, initialDocument: Object.create({ inherited: true }) })
  ).toBe(false);
});

function deepDocument(): object {
  let value: object = {};
  for (let depth = 0; depth < 33; depth += 1) value = { child: value };
  return value;
}

function withFrame(plan: Awaited<ReturnType<typeof replayPlan>>, frame: object) {
  return { ...plan, frames: [{ ...plan.frames[0], ...frame }] };
}

function withOperation(plan: Awaited<ReturnType<typeof replayPlan>>, operation: object) {
  return withFrame(plan, { operations: [operation] });
}
