import assert from "node:assert/strict";
import test from "node:test";

test("accepts the committed hierarchical module lock", async () => {
  await assert.doesNotReject(() => import("./check-modules.mjs"));
});
