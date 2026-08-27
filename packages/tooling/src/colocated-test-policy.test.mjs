import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  COLOCATION_SOURCE_EXEMPTIONS,
  colocationExemptionPaths
} from "./colocated-test-policy.mjs";

test("limits repository colocation exemptions to reviewed non-runtime boundaries", () => {
  assert.deepEqual(
    COLOCATION_SOURCE_EXEMPTIONS.map(({ path }) => path),
    [
      "apps/reference/src/main.ts",
      "apps/reference/src/main.types.ts",
      "apps/reference/src/store-fixture.ts",
      "examples/test-scenario/src/contact-form.scenario.ts"
    ]
  );
  assert.ok(COLOCATION_SOURCE_EXEMPTIONS.every(({ reason }) => reason.length >= 40));
});

test("resolves exemption paths from the workspace root", () => {
  assert.equal(
    colocationExemptionPaths("workspace")[0],
    resolve("workspace", "apps/reference/src/main.ts")
  );
});
