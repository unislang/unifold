import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, expect, it } from "vitest";

import { copyStarterTemplate, materializeStarterTemplate } from "./starter-template.js";

let root = "";

beforeEach(async () => {
  root = join(tmpdir(), `unifold-cli-template-${crypto.randomUUID()}`);
  for (const path of [
    "playwright.config.ts",
    "src/main.unit.ts",
    "src/main.ts",
    "tests/starter.spec.ts"
  ]) {
    const target = join(root, `${path}.template`);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, path);
  }
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

it("materializes every generated TypeScript module", async () => {
  await materializeStarterTemplate(root);
  await expect(stat(join(root, "src", "main.ts"))).resolves.toBeDefined();
  await expect(stat(join(root, "src", "main.unit.ts.template"))).rejects.toThrow();
  await expect(stat(join(root, "tests", "starter.spec.ts"))).resolves.toBeDefined();
});

it("copies template contents into an existing empty stage", async () => {
  const stage = join(tmpdir(), `unifold-cli-stage-${crypto.randomUUID()}`);
  await mkdir(stage);
  try {
    await copyStarterTemplate(new URL("../templates/vanilla/", import.meta.url), stage);
    await expect(stat(join(stage, "index.html"))).resolves.toBeDefined();
    await expect(stat(join(stage, "src", "ui.json"))).resolves.toBeDefined();
  } finally {
    await rm(stage, { force: true, recursive: true });
  }
});
