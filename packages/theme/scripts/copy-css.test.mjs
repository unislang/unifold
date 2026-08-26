import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { copyThemeCss } from "./copy-css.mjs";

test("copies both public theme stylesheets", async (context) => {
  const sourceRoot = await mkdtemp(join(tmpdir(), "unifold-theme-source-"));
  const outputRoot = await mkdtemp(join(tmpdir(), "unifold-theme-output-"));
  context.after(() => Promise.all([remove(sourceRoot), remove(outputRoot)]));
  await Promise.all([
    writeFile(join(sourceRoot, "tailwind.css"), "tailwind", "utf8"),
    writeFile(join(sourceRoot, "tokens.css"), "tokens", "utf8")
  ]);
  await copyThemeCss(sourceRoot, outputRoot);
  assert.equal(await readFile(join(outputRoot, "tailwind.css"), "utf8"), "tailwind");
  assert.equal(await readFile(join(outputRoot, "tokens.css"), "utf8"), "tokens");
});

function remove(path) {
  return rm(path, { force: true, recursive: true });
}
