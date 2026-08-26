import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { coreCatalog } from "@unislang/unifold-catalog";
import { fileURLToPath } from "node:url";

import { generateComponentArtifacts } from "./generate-cem.mjs";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../src");

test("writes complete manifest and component-definition artifacts", async (context) => {
  const outputRoot = await mkdtemp(join(tmpdir(), "unifold-cem-"));
  context.after(() => rm(outputRoot, { force: true, recursive: true }));
  await generateComponentArtifacts(sourceRoot, outputRoot);
  const manifest = await readJson(join(outputRoot, "custom-elements.json"));
  const definitions = await readJson(join(outputRoot, "component-definitions.json"));
  const expectedCount = Object.keys(coreCatalog.components).length;
  assert.equal(
    manifest.modules.flatMap((module) => module.declarations ?? []).length,
    expectedCount
  );
  assert.equal(definitions.definitions.length, expectedCount);
});

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
