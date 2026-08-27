import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { UnifoldPreparationStatus, prepareUnifoldDocument } from "@unislang/unifold";
import {
  createUiModuleApplicationInput,
  uiModuleIntegrity,
  validateUiModuleLock
} from "@unislang/unifold-modules";
import { afterEach, beforeEach, expect, it } from "vitest";

import {
  UnifoldCliCommand,
  UnifoldCliDiagnosticCode,
  UnifoldCliModuleAction,
  UnifoldCliStatus
} from "./enums.js";
import { UI_MODULE_BUILD_SCHEMA, validateUiModuleBuildArtifact } from "./module-build-schema.js";
import { runUiModuleCommand } from "./module-command.js";
import { writeModuleProject } from "./module-project.test-data.js";

let root = "";
let outside = "";

beforeEach(async () => {
  root = join(tmpdir(), `unifold-module-command-${crypto.randomUUID()}`);
  outside = join(tmpdir(), `unifold-module-command-outside-${crypto.randomUUID()}`);
  await Promise.all([mkdir(join(root, "dist"), { recursive: true }), mkdir(outside)]);
  await writeModuleProject(root);
});

afterEach(async () => {
  await Promise.all([
    rm(root, { force: true, recursive: true }),
    rm(outside, { force: true, recursive: true })
  ]);
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
  const validated = validateUiModuleBuildArtifact(artifact).artifact;
  if (validated === undefined) throw new Error("Expected validated build artifact.");
  const preparation = prepareUnifoldDocument(validated.resolvedArtifact.document);
  expect(preparation.status).toBe(UnifoldPreparationStatus.Valid);
  expect(await uiModuleIntegrity(requirePrepared(preparation).document)).toBe(lock["irIntegrity"]);
  expect(validated.resolvedArtifact.integrity).toBe(lock["artifactIntegrity"]);
  const input = await createUiModuleApplicationInput(
    validated.resolvedArtifact,
    lock["artifactIntegrity"] as string
  );
  expect(
    prepareUnifoldDocument(input.document, { layoutRegistry: input.layoutRegistry }).status
  ).toBe(UnifoldPreparationStatus.Valid);
});

it("checks a current committed lock without writing", async () => {
  expect((await runUiModuleCommand(flattenInvocation(), root)).status).toBe(
    UnifoldCliStatus.Succeeded
  );
  const lockPath = join(root, "dist", "ui.module.lock.json");
  const before = await readFile(lockPath, "utf8");
  await rm(join(root, "dist", "ui.module.json"));
  const result = await runUiModuleCommand(checkInvocation(), root);
  expect(result).toMatchObject({ status: UnifoldCliStatus.Succeeded });
  expect(result.message).toContain("lock is current");
  expect(await readFile(lockPath, "utf8")).toBe(before);
});

it("rejects invalid and stale committed locks", async () => {
  const lockPath = join(root, "dist", "ui.module.lock.json");
  await writeFile(lockPath, "{}");
  const invalid = await runUiModuleCommand(checkInvocation(), root);
  expect(invalid).toMatchObject({
    diagnostics: expect.arrayContaining([
      expect.objectContaining({ code: UnifoldCliDiagnosticCode.ModuleLockInvalid })
    ]),
    status: UnifoldCliStatus.Failed
  });
  await rm(lockPath);
  expect((await runUiModuleCommand(flattenInvocation(), root)).status).toBe(
    UnifoldCliStatus.Succeeded
  );
  await writeStaleLock(lockPath);
  const stale = await runUiModuleCommand(checkInvocation(), root);
  expect(stale).toMatchObject({
    diagnostics: [{ code: UnifoldCliDiagnosticCode.ModuleLockStale }],
    status: UnifoldCliStatus.Failed
  });
});

it("rejects a lock symlink that resolves outside the project root", async () => {
  await writeFile(join(outside, "ui.lock.json"), "{}");
  await symlink(outside, join(root, "linked"), "junction");
  const result = await runUiModuleCommand(
    { ...checkInvocation(), lockPath: "linked/ui.lock.json" },
    root
  );
  expect(result).toMatchObject({
    diagnostics: [
      {
        code: UnifoldCliDiagnosticCode.ModuleLockInvalid,
        message: expect.stringContaining("escapes the project root")
      }
    ],
    status: UnifoldCliStatus.Failed
  });
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

function checkInvocation() {
  return {
    action: UnifoldCliModuleAction.Check,
    command: UnifoldCliCommand.Module,
    lockPath: "dist/ui.module.lock.json",
    manifestPath: "modules.project.json"
  } as const;
}

async function writeStaleLock(path: string): Promise<void> {
  const lock = await readJson(path);
  lock["artifactIntegrity"] = `sha256-${"x".repeat(43)}`;
  await writeFile(path, JSON.stringify(lock, null, 2));
}

function requirePrepared(result: ReturnType<typeof prepareUnifoldDocument>) {
  if (result.prepared === undefined) throw new Error("Expected the flattened document to compile.");
  return result.prepared;
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}
