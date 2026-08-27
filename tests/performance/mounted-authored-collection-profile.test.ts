// @vitest-environment happy-dom

import { writeFile } from "node:fs/promises";

import { expect, it } from "vitest";

import { measureMountedCollectionMutation } from "./mounted-authored-collection-fixture.js";

const outputPath = process.env["UNIFOLD_MOUNTED_COLLECTION_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the mounted authored-collection gate", async () => {
  const evidence = measureMountedCollectionMutation();
  expect(evidence.gate.passed, JSON.stringify(evidence.gate)).toBe(true);
  await writeFile(String(outputPath), `${JSON.stringify(evidence, null, 2)}\n`);
});
