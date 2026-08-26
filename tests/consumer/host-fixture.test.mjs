import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { copyConsumerFixture, writeHostManifest } from "./host-fixture.mjs";

test("copies authored host files and rewrites internal dependencies to tarballs", async () => {
  const root = await mkdtemp(join(tmpdir(), "unifold-host-fixture-"));
  const source = join(root, "source");
  const target = join(root, "target");
  try {
    await mkdir(join(source, "node_modules"), { recursive: true });
    await writeFile(join(source, "package.json"), '{"dependencies":{"vue":"3.5.41"}}');
    await writeFile(join(source, "node_modules", "ignored.txt"), "ignored");
    await copyConsumerFixture(source, target);
    await writeHostManifest(target, new Map([["@unislang/unifold", join(root, "unifold.tgz")]]));
    const manifest = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
    assert.equal(manifest.dependencies.vue, "3.5.41");
    assert.match(manifest.dependencies["@unislang/unifold"], /^file:/u);
    await assert.rejects(readFile(join(target, "node_modules", "ignored.txt")));
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
