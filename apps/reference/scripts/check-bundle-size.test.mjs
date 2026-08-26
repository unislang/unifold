import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { checkReferenceBundle } from "./check-bundle-size.mjs";

test("sums every JavaScript chunk and enforces the gzip budget", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "unifold-reference-bundle-"));
  context.after(() => rm(root, { force: true, recursive: true }));
  await mkdir(root, { recursive: true });
  await Promise.all([
    writeFile(join(root, "entry.js"), "export const entry = 'entry';", "utf8"),
    writeFile(join(root, "lazy.js"), "export const lazy = 'lazy';", "utf8"),
    writeFile(join(root, "styles.css"), "ignored", "utf8")
  ]);

  const evidence = await checkReferenceBundle(root, 1_024);
  assert.deepEqual(evidence.files, ["entry.js", "lazy.js"]);
  assert(evidence.gzipBytes > 0);
  await assert.rejects(() => checkReferenceBundle(root, evidence.gzipBytes - 1), /limit is/u);
});
