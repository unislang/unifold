import { lstat, mkdir, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";

import { UnifoldCliDiagnosticCode } from "./enums.js";
import { cliFailure } from "./result.js";
import type { UnifoldCliResult } from "./types.js";

export interface SafeStarterTarget {
  readonly packageName: string;
  readonly parent: string;
  readonly path: string;
}

export async function resolveStarterTarget(
  directory: string,
  cwd: string
): Promise<SafeStarterTarget | UnifoldCliResult> {
  const candidate = await initialCandidate(directory, cwd);
  if (isCliResult(candidate)) return candidate;
  return physicalTarget(candidate);
}

interface StarterTargetCandidate {
  readonly packageName: string;
  readonly path: string;
  readonly workspace: string;
}

async function initialCandidate(
  directory: string,
  cwd: string
): Promise<StarterTargetCandidate | UnifoldCliResult> {
  const workspace = await realpath(cwd);
  const requested = resolve(workspace, directory);
  if (!isWithin(workspace, requested))
    return unsafe(directory, "Target must be below the current directory.");
  const packageName = basename(requested);
  if (!isPackageName(packageName))
    return unsafe(directory, "Target name is not a valid package name.");
  return { packageName, path: requested, workspace };
}

async function physicalTarget(
  candidate: StarterTargetCandidate
): Promise<SafeStarterTarget | UnifoldCliResult> {
  const physicalParent = await resolvePhysicalParent(candidate);
  if (typeof physicalParent !== "string") return physicalParent;
  return availableTarget(candidate, physicalParent);
}

async function resolvePhysicalParent(
  candidate: StarterTargetCandidate
): Promise<string | UnifoldCliResult> {
  const parent = dirname(candidate.path);
  const ancestor = await realpath(await existingAncestor(parent));
  if (!isAtOrWithin(candidate.workspace, ancestor))
    return unsafe(candidate.path, "Target parent resolves outside the current directory.");
  await mkdir(parent, { recursive: true });
  const physicalParent = await realpath(parent);
  return checkedPhysicalParent(candidate, physicalParent);
}

function checkedPhysicalParent(
  candidate: StarterTargetCandidate,
  physicalParent: string
): string | UnifoldCliResult {
  const physicalTarget = resolve(physicalParent, candidate.packageName);
  if (!isWithin(candidate.workspace, physicalTarget))
    return unsafe(candidate.path, "Target parent resolves outside the current directory.");
  return physicalParent;
}

async function availableTarget(
  candidate: StarterTargetCandidate,
  physicalParent: string
): Promise<SafeStarterTarget | UnifoldCliResult> {
  const physicalTarget = resolve(physicalParent, candidate.packageName);
  if (await pathExists(physicalTarget)) return exists(physicalTarget);
  return { packageName: candidate.packageName, parent: physicalParent, path: physicalTarget };
}

async function existingAncestor(path: string): Promise<string> {
  let candidate = path;
  while (!(await pathExists(candidate))) {
    const parent = dirname(candidate);
    if (parent === candidate) return candidate;
    candidate = parent;
  }
  return candidate;
}

function isAtOrWithin(parent: string, candidate: string): boolean {
  return resolve(parent) === resolve(candidate) || isWithin(parent, candidate);
}

function isWithin(parent: string, candidate: string): boolean {
  const nested = relative(resolve(parent), resolve(candidate));
  return nested.length > 0 && !nested.startsWith("..") && !isAbsolute(nested);
}

function isPackageName(value: string): boolean {
  if (value.length === 0 || value.length > 214) return false;
  return /^[a-z0-9][a-z0-9._-]*$/u.test(value);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (errorCode(error) === "ENOENT") return false;
    throw error;
  }
}

function unsafe(path: string, message: string): UnifoldCliResult {
  return cliFailure("Starter target is unsafe.", [
    { code: UnifoldCliDiagnosticCode.StarterTargetUnsafe, message, path }
  ]);
}

function exists(path: string): UnifoldCliResult {
  return cliFailure("Starter target already exists.", [
    {
      code: UnifoldCliDiagnosticCode.StarterTargetExists,
      message: "Refusing to overwrite an existing path.",
      path
    }
  ]);
}

function errorCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  const code = Reflect.get(error, "code");
  return typeof code === "string" ? code : undefined;
}

function isRecord(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

function isCliResult(value: StarterTargetCandidate | UnifoldCliResult): value is UnifoldCliResult {
  return "status" in value;
}
