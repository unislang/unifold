import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import { generateStaticHtml } from "./generate-static-html.mjs";

test("writes only the exact deterministic static export", async () => {
  const outputPath = join(tmpdir(), `unifold-static-${crypto.randomUUID()}.html`);
  const manifestPath = `${outputPath}.manifest.json`;
  const outputUrl = pathToFileURL(outputPath);
  const manifestUrl = pathToFileURL(manifestPath);
  try {
    const expected = await generateStaticHtml(outputUrl, manifestUrl);
    const html = await readFile(outputUrl, "utf8");
    const manifestContent = await readFile(manifestUrl, "utf8");
    const manifest = JSON.parse(manifestContent);
    assert.equal(html, expected.content);
    assert.equal(manifestContent, expected.manifestContent);
    assert.equal(manifest.sha256, createHash("sha256").update(html).digest("hex"));
    assert.equal(count(html, "data-unifold-semantics"), 1);
    assert.equal(html.includes("upgrade.js"), false);
  } finally {
    await rm(outputPath, { force: true });
    await rm(manifestPath, { force: true });
  }
});

function count(value, token) {
  return value.split(token).length - 1;
}
