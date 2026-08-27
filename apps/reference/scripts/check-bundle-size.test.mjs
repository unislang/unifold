import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { checkReferenceBundle } from "./check-bundle-size.mjs";

test("gates the initial import closure and audits deferred chunks separately", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "unifold-reference-bundle-"));
  context.after(() => rm(root, { force: true, recursive: true }));
  await mkdir(join(root, ".vite"), { recursive: true });
  await mkdir(join(root, "assets"), { recursive: true });
  await Promise.all([
    writeFile(join(root, "assets", "entry.js"), "export const entry = 'entry';", "utf8"),
    writeFile(join(root, "assets", "shared.js"), "export const shared = 'shared';", "utf8"),
    writeFile(join(root, "assets", "lazy.js"), "export const lazy = 'lazy';", "utf8"),
    writeFile(
      join(root, ".vite", "manifest.json"),
      JSON.stringify({
        "index.html": {
          dynamicImports: ["src/lazy.ts"],
          file: "assets/entry.js",
          imports: ["src/shared.ts"],
          isEntry: true
        },
        "src/lazy.ts": { file: "assets/lazy.js", isDynamicEntry: true },
        "src/shared.ts": { file: "assets/shared.js" }
      }),
      "utf8"
    )
  ]);

  const evidence = await checkReferenceBundle(root, 1_024);
  assert.deepEqual(evidence.files, ["assets/entry.js", "assets/shared.js"]);
  assert.deepEqual(evidence.deferredFiles, ["assets/lazy.js"]);
  assert(evidence.gzipBytes > 0);
  assert(evidence.deferredGzipBytes > 0);
  await assert.rejects(() => checkReferenceBundle(root, evidence.gzipBytes - 1), /limit is/u);
  await writeFile(
    join(root, "assets", "lazy.js"),
    "globalThis.__unifoldMigrateProfile = () => {};",
    "utf8"
  );
  await assert.rejects(() => checkReferenceBundle(root, 1_024), /test hook/u);
});
