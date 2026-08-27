import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { UnifoldPreparationStatus, prepareUnifoldDocument } from "@unislang/unifold";
import { uiModuleIntegrity, validateUiModuleLock } from "@unislang/unifold-modules";
import { afterEach, beforeEach, expect, it } from "vitest";

import {
  UnifoldCliCommand,
  UnifoldCliDiagnosticCode,
  UnifoldCliModuleAction,
  UnifoldCliStatus
} from "./enums.js";
import { UI_MODULE_BUILD_SCHEMA, runUiModuleCommand } from "./module-command.js";
import { writeModuleProject } from "./module-project.test-data.js";

let root = "";

beforeEach(async () => {
  root = join(tmpdir(), `unifold-module-command-${crypto.randomUUID()}`);
  await mkdir(join(root, "dist"), { recursive: true });
  await writeModuleProject(root);
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

it("validates without writing artifacts", async () => {
  const result = await runUiModuleCommand(
    {
      action: UnifoldCliModuleAction.Validate,
      command: UnifoldCliCommand.Module,
      manifestPath: "modules.project.json"
    },
    root
  );
  expect(result).toMatchObject({ status: UnifoldCliStatus.Succeeded });
  expect(result.message).toContain("integrity: sha256-");
  expect(result.message).toContain("IR: sha256-");
});

it("writes a deterministic runtime artifact and validated lock with IR parity", async () => {
  const result = await runUiModuleCommand(flattenInvocation(), root);
  expect(result.status).toBe(UnifoldCliStatus.Succeeded);
  const artifact = await readJson(join(root, "dist", "ui.module.json"));
  const lock = await readJson(join(root, "dist", "ui.module.lock.json"));
  expect(artifact["$schema"]).toBe(UI_MODULE_BUILD_SCHEMA);
  expect(validateUiModuleLock(lock).diagnostics).toEqual([]);
  const preparation = prepareUnifoldDocument(artifact["document"]);
  expect(preparation.status).toBe(UnifoldPreparationStatus.Valid);
  expect(await uiModuleIntegrity(requirePrepared(preparation).document)).toBe(lock["irIntegrity"]);
  expect(artifact["integrity"]).toBe(lock["artifactIntegrity"]);
});

it("refuses traversal and overwrite of generated artifacts", async () => {
  const unsafe = await runUiModuleCommand(
    { ...flattenInvocation(), outputPath: "../outside.json" },
    root
  );
  expect(unsafe.status).toBe(UnifoldCliStatus.Failed);
  expect((await runUiModuleCommand(flattenInvocation(), root)).status).toBe(
    UnifoldCliStatus.Succeeded
  );
  expect((await runUiModuleCommand(flattenInvocation(), root)).status).toBe(
    UnifoldCliStatus.Failed
  );
});

it("propagates project diagnostics and rejects ambiguous output targets", async () => {
  await rm(join(root, "modules"), { force: true, recursive: true });
  await writeModuleProject(root, true);
  const invalid = await runUiModuleCommand(flattenInvocation(), root);
  expect(invalid).toMatchObject({
    diagnostics: [{ code: UnifoldCliDiagnosticCode.ModuleInvalid }],
    status: UnifoldCliStatus.Failed
  });
  await rm(join(root, "modules"), { force: true, recursive: true });
  await writeModuleProject(root);
  const ambiguous = await runUiModuleCommand(
    { ...flattenInvocation(), lockPath: "dist/ui.module.json" },
    root
  );
  expect(ambiguous).toMatchObject({
    diagnostics: [{ code: UnifoldCliDiagnosticCode.ModuleWriteFailed }],
    status: UnifoldCliStatus.Failed
  });
});

function flattenInvocation() {
  return {
    action: UnifoldCliModuleAction.Flatten,
    command: UnifoldCliCommand.Module,
    lockPath: "dist/ui.module.lock.json",
    manifestPath: "modules.project.json",
    outputPath: "dist/ui.module.json"
  } as const;
}

function requirePrepared(result: ReturnType<typeof prepareUnifoldDocument>) {
  if (result.prepared === undefined) throw new Error("Expected the flattened document to compile.");
  return result.prepared;
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}
