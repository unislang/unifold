import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, expect, it } from "vitest";

import { UnifoldCliDiagnosticCode, UnifoldCliStatus } from "./enums.js";
import { runUnifoldCli } from "./runner.js";

let root = "";

beforeEach(async () => {
  root = join(tmpdir(), `unifold-cli-runner-${crypto.randomUUID()}`);
  await mkdir(root);
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

it("dispatches starter generation", async () => {
  const result = await runUnifoldCli(["generate", "starter", "demo", "--no-install"], {
    cwd: root,
    packageVersion: "2.0.0"
  });
  expect(result.status).toBe(UnifoldCliStatus.Succeeded);
  const manifest = JSON.parse(await readFile(join(root, "demo", "package.json"), "utf8"));
  expect(manifest.dependencies["@unislang/unifold"]).toBe("2.0.0");
});

it("dispatches document validation", async () => {
  await writeFile(join(root, "invalid.json"), "{}");
  const result = await runUnifoldCli(["validate", "invalid.json"], { cwd: root });
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: UnifoldCliDiagnosticCode.DocumentInvalid })
    ])
  );
});

it("dispatches UiModule validation and lock checking", async () => {
  const { writeModuleProject } = await import("./module-project.test-data.js");
  await writeModuleProject(root);
  const validation = await runUnifoldCli(["module", "validate", "modules.project.json"], {
    cwd: root
  });
  expect(validation.status).toBe(UnifoldCliStatus.Succeeded);
  await mkdir(join(root, "dist"));
  const flatten = [
    "module",
    "flatten",
    "modules.project.json",
    "--output",
    "dist/ui.json",
    "--lock",
    "dist/ui.lock.json"
  ];
  expect((await runUnifoldCli(flatten, { cwd: root })).status).toBe(UnifoldCliStatus.Succeeded);
  const check = ["module", "check", "modules.project.json", "--lock", "dist/ui.lock.json"];
  expect((await runUnifoldCli(check, { cwd: root })).status).toBe(UnifoldCliStatus.Succeeded);
});

it("returns a bounded invocation diagnostic", async () => {
  await expect(runUnifoldCli(["unknown"], { cwd: root })).resolves.toMatchObject({
    diagnostics: [{ code: UnifoldCliDiagnosticCode.InvocationInvalid }],
    status: UnifoldCliStatus.Failed
  });
});
