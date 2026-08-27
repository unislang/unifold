import { lstat, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { UnifoldCliDiagnosticCode } from "./enums.js";
import { resolveStarterTarget } from "./starter-path.js";

let root = "";
let outside = "";

beforeEach(async () => {
  root = join(tmpdir(), `unifold-cli-target-${crypto.randomUUID()}`);
  outside = join(tmpdir(), `unifold-cli-outside-${crypto.randomUUID()}`);
  await Promise.all([mkdir(root), mkdir(outside)]);
});

afterEach(async () => {
  await Promise.all([
    rm(root, { force: true, recursive: true }),
    rm(outside, { force: true, recursive: true })
  ]);
});

describe("starter target safety", () => {
  it("accepts a new nested package target", acceptsNestedTarget);

  it.each([["."], [".."], ["../escape"], ["Bad Name"], [".hidden"]])(
    "rejects unsafe target %s",
    rejectsUnsafeTarget
  );

  it("rejects existing files and directories", rejectsExistingTarget);

  it("rejects a parent symlink that leaves the workspace", rejectsEscapingSymlink);
});

async function acceptsNestedTarget(): Promise<void> {
  await expect(resolveStarterTarget("apps/my-app", root)).resolves.toMatchObject({
    packageName: "my-app"
  });
}

async function rejectsUnsafeTarget(target: string): Promise<void> {
  await expect(resolveStarterTarget(target, root)).resolves.toMatchObject({
    diagnostics: [{ code: UnifoldCliDiagnosticCode.StarterTargetUnsafe }]
  });
}

async function rejectsExistingTarget(): Promise<void> {
  await writeFile(join(root, "occupied"), "value");
  await mkdir(join(root, "folder"));
  for (const target of ["occupied", "folder"]) {
    await expect(resolveStarterTarget(target, root)).resolves.toMatchObject({
      diagnostics: [{ code: UnifoldCliDiagnosticCode.StarterTargetExists }]
    });
  }
}

async function rejectsEscapingSymlink(): Promise<void> {
  await symlink(outside, join(root, "linked"), "junction");
  await expect(resolveStarterTarget("linked/nested/app", root)).resolves.toMatchObject({
    diagnostics: [{ code: UnifoldCliDiagnosticCode.StarterTargetUnsafe }]
  });
  await expect(lstat(join(outside, "nested"))).rejects.toMatchObject({ code: "ENOENT" });
}
