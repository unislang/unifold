import assert from "node:assert/strict";
import test from "node:test";

test("accepts both committed Studio module locks", async () => {
  await assert.doesNotReject(() => import("./check-modules.mjs"));
});
