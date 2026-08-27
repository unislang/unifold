import { lstat, realpath, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";

import {
  createUiModuleLock,
  validateUiModuleLock,
  type UiModuleLock,
  type UiResolvedModuleArtifact
} from "@unislang/unifold-modules";

import {
  UnifoldCliDiagnosticCode,
  UnifoldCliModuleAction,
  UnifoldCliModuleBuildSchemaUri,
  UnifoldCliModuleBuildSchemaVersion
} from "./enums.js";
import { resolveUiModuleProject, type ResolvedUiModuleProject } from "./module-project.js";
import { cliFailure, cliSuccess } from "./result.js";
import type {
  FlattenModuleInvocation,
  UnifoldCliResult,
  ValidateModuleInvocation
} from "./types.js";

export const UI_MODULE_BUILD_SCHEMA = UnifoldCliModuleBuildSchemaUri.Version1;

export interface UiModuleBuildArtifact {
  readonly $schema: UnifoldCliModuleBuildSchemaUri.Version1;
  readonly document: UiResolvedModuleArtifact["composedDocument"];
  readonly entry: ResolvedUiModuleProject["entry"];
  readonly integrity: string;
  readonly irIntegrity: string;
  readonly resources: UiResolvedModuleArtifact["resources"];
  readonly schemaVersion: UnifoldCliModuleBuildSchemaVersion.Version1;
  readonly sourceMap: UiResolvedModuleArtifact["sourceMap"];
}

export async function runUiModuleCommand(
  invocation: FlattenModuleInvocation | ValidateModuleInvocation,
  cwd?: string
): Promise<UnifoldCliResult> {
  const resolved = await resolveUiModuleProject(invocation.manifestPath, cwd);
  if ("diagnostics" in resolved) {
    return cliFailure("UiModule project validation failed.", resolved.diagnostics);
  }
  if (invocation.action === UnifoldCliModuleAction.Validate) {
    return cliSuccess(validationMessage(resolved.project));
  }
  return writeFlattenedProject(resolved.project, invocation);
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

function buildArtifact(project: ResolvedUiModuleProject): UiModuleBuildArtifact {
  return {
    $schema: UI_MODULE_BUILD_SCHEMA,
    document: project.artifact.composedDocument,
    entry: project.entry,
    integrity: project.artifact.integrity,
    irIntegrity: project.irIntegrity,
    resources: project.artifact.resources,
    schemaVersion: UnifoldCliModuleBuildSchemaVersion.Version1,
    sourceMap: project.artifact.sourceMap
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
  return error instanceof Error ? error.message : "Unable to write UiModule artifacts.";
}
