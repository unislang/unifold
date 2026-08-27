import { lstat, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  createUiModuleLock,
  validateUiModuleLock,
  type UiModuleDiagnostic,
  type UiModuleLock
} from "@unislang/unifold-modules";

import {
  UnifoldCliDiagnosticCode,
  UnifoldCliModuleAction,
  UnifoldCliModuleBuildSchemaVersion
} from "./enums.js";
import {
  UI_MODULE_BUILD_SCHEMA,
  validateUiModuleBuildArtifact,
  type UiModuleBuildArtifact
} from "./module-build-schema.js";
import { resolveUiModuleProject, type ResolvedUiModuleProject } from "./module-project.js";
import { cliFailure, cliSuccess } from "./result.js";
import type {
  CheckModuleInvocation,
  FlattenModuleInvocation,
  UnifoldCliDiagnostic,
  UnifoldCliResult,
  ValidateModuleInvocation
} from "./types.js";

const MAXIMUM_LOCK_BYTES = 1_048_576;

export async function runUiModuleCommand(
  invocation: CheckModuleInvocation | FlattenModuleInvocation | ValidateModuleInvocation,
  cwd?: string
): Promise<UnifoldCliResult> {
  const resolved = await resolveUiModuleProject(invocation.manifestPath, cwd);
  if ("diagnostics" in resolved) {
    return cliFailure("UiModule project validation failed.", resolved.diagnostics);
  }
  return runResolvedModuleCommand(resolved.project, invocation);
}

function runResolvedModuleCommand(
  project: ResolvedUiModuleProject,
  invocation: CheckModuleInvocation | FlattenModuleInvocation | ValidateModuleInvocation
): Promise<UnifoldCliResult> {
  if (invocation.action === UnifoldCliModuleAction.Validate) {
    return Promise.resolve(cliSuccess(validationMessage(project)));
  }
  if (invocation.action === UnifoldCliModuleAction.Check) {
    return checkCommittedLock(project, invocation);
  }
  return writeFlattenedProject(project, invocation);
}

async function checkCommittedLock(
  project: ResolvedUiModuleProject,
  invocation: CheckModuleInvocation
): Promise<UnifoldCliResult> {
  try {
    return await compareCommittedLock(project, invocation);
  } catch (error) {
    return unreadableLockResult(invocation.lockPath, error);
  }
}

async function compareCommittedLock(
  project: ResolvedUiModuleProject,
  invocation: CheckModuleInvocation
): Promise<UnifoldCliResult> {
  const expected = expectedLock(project);
  const committed = validateUiModuleLock(
    await readCommittedLock(project.root, invocation.lockPath)
  );
  if (committed.lock === undefined)
    return invalidLockResult(invocation.lockPath, committed.diagnostics);
  if (!isDeepStrictEqual(committed.lock, expected)) return staleLockResult(invocation.lockPath);
  return cliSuccess(`UiModule lock is current: ${invocation.lockPath}.`);
}

function expectedLock(project: ResolvedUiModuleProject): UiModuleLock {
  const lock = createUiModuleLock(project.artifact, project.entry, project.irIntegrity);
  requireValidLock(lock);
  return lock;
}

async function readCommittedLock(root: string, input: string): Promise<unknown> {
  requireSafeOutputInput(input);
  const path = await realpath(resolve(root, input));
  requireLockWithinRoot(root, path, input);
  const metadata = await stat(path);
  requireRegularLock(metadata.isFile(), input);
  requireBoundedLock(metadata.size, input);
  return parseJson(await readFile(path, "utf8"));
}

function requireLockWithinRoot(root: string, path: string, input: string): void {
  if (!isWithin(root, path)) throw new Error(`Lock escapes the project root: ${input}.`);
}

function requireRegularLock(isFile: boolean, input: string): void {
  if (!isFile) throw new Error(`Lock is not a regular file: ${input}.`);
}

function requireBoundedLock(size: number, input: string): void {
  if (size > MAXIMUM_LOCK_BYTES) throw new Error(`Lock exceeds 1 MiB: ${input}.`);
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error("Lock is not valid JSON.");
  }
}

function invalidLockResult(
  lockPath: string,
  diagnostics: readonly UiModuleDiagnostic[]
): UnifoldCliResult {
  return cliFailure(
    "UiModule lock check failed.",
    diagnostics.map((diagnostic) => lockDiagnostic(lockPath, diagnostic))
  );
}

function lockDiagnostic(lockPath: string, diagnostic: UiModuleDiagnostic): UnifoldCliDiagnostic {
  return {
    code: UnifoldCliDiagnosticCode.ModuleLockInvalid,
    message: diagnostic.message,
    path: diagnostic.path,
    sourceCode: diagnostic.code,
    sourceId: lockPath
  };
}

function staleLockResult(lockPath: string): UnifoldCliResult {
  return cliFailure("UiModule lock check failed.", [
    {
      code: UnifoldCliDiagnosticCode.ModuleLockStale,
      message: "Committed lock does not match the resolved module project.",
      path: lockPath
    }
  ]);
}

function unreadableLockResult(lockPath: string, error: unknown): UnifoldCliResult {
  return cliFailure("UiModule lock check failed.", [
    {
      code: UnifoldCliDiagnosticCode.ModuleLockInvalid,
      message: errorMessage(error),
      path: lockPath
    }
  ]);
}

async function writeFlattenedProject(
  project: ResolvedUiModuleProject,
  invocation: FlattenModuleInvocation
): Promise<UnifoldCliResult> {
  try {
    const [outputPath, lockPath] = await outputPaths(project.root, invocation);
    const lock = createUiModuleLock(project.artifact, project.entry, project.irIntegrity);
    requireValidLock(lock);
    const artifact = buildArtifact(project);
    requireValidArtifact(artifact);
    await writePair(outputPath, artifact, lockPath, lock);
    return cliSuccess(`Flattened UiModule project to ${outputPath}; lock: ${lockPath}.`);
  } catch (error) {
    return cliFailure("UiModule flattening failed.", [
      {
        code: UnifoldCliDiagnosticCode.ModuleWriteFailed,
        message: errorMessage(error)
      }
    ]);
  }
}

function requireValidArtifact(artifact: UiModuleBuildArtifact): void {
  const validation = validateUiModuleBuildArtifact(artifact);
  if (validation.artifact === undefined)
    throw new Error("Generated UiModule build artifact failed validation.");
}

function buildArtifact(project: ResolvedUiModuleProject): UiModuleBuildArtifact {
  return {
    $schema: UI_MODULE_BUILD_SCHEMA,
    entry: project.entry,
    irIntegrity: project.irIntegrity,
    resolvedArtifact: project.artifact,
    schemaVersion: UnifoldCliModuleBuildSchemaVersion.Version2
  };
}

function requireValidLock(lock: UiModuleLock): void {
  const validation = validateUiModuleLock(lock);
  if (validation.lock === undefined) throw new Error("Generated UiModule lock failed validation.");
}

async function outputPaths(
  root: string,
  invocation: FlattenModuleInvocation
): Promise<readonly [string, string]> {
  const output = await safeNewOutput(root, invocation.outputPath);
  const lock = await safeNewOutput(root, invocation.lockPath);
  if (output === lock) throw new Error("Artifact and lock paths must be different.");
  return [output, lock];
}

async function safeNewOutput(root: string, input: string): Promise<string> {
  requireSafeOutputInput(input);
  const path = resolve(root, input);
  const parent = await realpath(dirname(path));
  requireOutputParent(root, parent, input);
  const output = resolve(parent, basename(path));
  await requireNewOutput(output, input);
  return output;
}

function requireSafeOutputInput(input: string): void {
  if (!isSafeRelativePath(input)) throw new Error(`Unsafe output path: ${input}.`);
}

function requireOutputParent(root: string, parent: string, input: string): void {
  if (!isWithin(root, parent)) throw new Error(`Output escapes the project root: ${input}.`);
}

async function requireNewOutput(path: string, input: string): Promise<void> {
  if (await pathExists(path)) throw new Error(`Output already exists: ${input}.`);
}

async function writePair(
  outputPath: string,
  artifact: UiModuleBuildArtifact,
  lockPath: string,
  lock: UiModuleLock
): Promise<void> {
  const outputTemporary = temporaryPath(outputPath);
  const lockTemporary = temporaryPath(lockPath);
  try {
    await Promise.all([
      writeFile(outputTemporary, encodedJson(artifact), { flag: "wx" }),
      writeFile(lockTemporary, encodedJson(lock), { flag: "wx" })
    ]);
    await rename(outputTemporary, outputPath);
    await publishLock(lockTemporary, lockPath, outputPath);
  } catch (error) {
    await Promise.all([rm(outputTemporary, { force: true }), rm(lockTemporary, { force: true })]);
    throw error;
  }
}

async function publishLock(stage: string, lockPath: string, outputPath: string): Promise<void> {
  try {
    await rename(stage, lockPath);
  } catch (error) {
    await rm(outputPath, { force: true });
    throw error;
  }
}

function temporaryPath(path: string): string {
  return `${path}.${crypto.randomUUID()}.tmp`;
}

function encodedJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isSafeRelativePath(value: string): boolean {
  if (!hasSafePathLength(value)) return false;
  return isPortableRelativePath(value);
}

function hasSafePathLength(value: string): boolean {
  return value.length >= 1 && value.length <= 1024;
}

function isPortableRelativePath(value: string): boolean {
  return !isAbsolute(value) && !value.split(/[\\/]/u).includes("..");
}

function isWithin(root: string, path: string): boolean {
  const offset = relative(root, path);
  return offset === "" || (!offset.startsWith("..") && !isAbsolute(offset));
}

function validationMessage(project: ResolvedUiModuleProject): string {
  return `UiModule project is valid: ${project.manifestPath}; integrity: ${project.artifact.integrity}; IR: ${project.irIntegrity}.`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to process UiModule artifacts.";
}
