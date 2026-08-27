import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";

const assetsRoot = resolve(import.meta.dirname, "../../../examples/studio/dist/assets");
const maximumGzipBytes = 250 * 1_024;

test("built Studio assets exclude provider generation code and credential markers", async () => {
  const files = (await readdir(assetsRoot)).filter((name) => name.endsWith(".js"));
  const source = (
    await Promise.all(files.map((name) => readFile(resolve(assetsRoot, name), "utf8")))
  ).join("\n");
  assert.doesNotMatch(source, /You are the Unifold UI design proposal engine/u);
  assert.doesNotMatch(source, /generateText/u);
  assert.doesNotMatch(source, /(?:api[_-]?key|authorization:\s*bearer)/iu);
  assert.ok(
    gzipSync(source).byteLength <= maximumGzipBytes,
    "Studio JavaScript exceeds 250 KiB gzip."
  );
});
