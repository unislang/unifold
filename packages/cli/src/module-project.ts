import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";

import {
  UnifoldPreparationStatus,
  prepareUnifoldDocument,
  type UnifoldApplicationDiagnostic
} from "@unislang/unifold";
import {
  UiModuleRegistryStatus,
  UiModuleResolutionStatus,
  createUiModuleRegistry,
  resolveUiModule,
  uiModuleIntegrity,
  type ResolveUiModuleOptions,
  type UiResolvedModuleArtifact
} from "@unislang/unifold-modules";

import {
  UnifoldCliDiagnosticCode,
  UnifoldCliModuleProjectSchemaUri,
  UnifoldCliModuleProjectSchemaVersion
} from "./enums.js";
import type { UnifoldCliDiagnostic } from "./types.js";

export const UI_MODULE_PROJECT_SCHEMA = UnifoldCliModuleProjectSchemaUri.Version1;
const MAXIMUM_MANIFEST_BYTES = 65_536;
const MAXIMUM_SOURCE_BYTES = 1_048_576;
const moduleIdPattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/u;
const versionPattern = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;
const exportPattern = /^[A-Za-z][A-Za-z0-9._-]*$/u;

export interface UiModuleProjectManifest {
  readonly $schema: UnifoldCliModuleProjectSchemaUri.Version1;
  readonly entry: ResolveUiModuleOptions;
  readonly schemaVersion: UnifoldCliModuleProjectSchemaVersion.Version1;
  readonly sources: readonly string[];
}

export interface ResolvedUiModuleProject {
  readonly artifact: UiResolvedModuleArtifact;
  readonly entry: ResolveUiModuleOptions;
  readonly irIntegrity: string;
  readonly manifestPath: string;
  readonly root: string;
}

export type ResolveUiModuleProjectResult =
  | { readonly diagnostics: readonly UnifoldCliDiagnostic[] }
  | { readonly project: ResolvedUiModuleProject };

export async function resolveUiModuleProject(
  inputPath: string,
  cwd?: string
): Promise<ResolveUiModuleProjectResult> {
  try {
    return await resolveProject(inputPath, cwd);
  } catch (error) {
    return failure(UnifoldCliDiagnosticCode.ModuleManifestInvalid, errorMessage(error), inputPath);
  }
}

async function resolveProject(
  inputPath: string,
  cwd: string | undefined
): Promise<ResolveUiModuleProjectResult> {
  const root = await projectRoot(cwd);
  const manifestPath = await safeExistingFile(root, root, inputPath, MAXIMUM_MANIFEST_BYTES);
  const manifest = parseManifest(await readFile(manifestPath, "utf8"));
  if (manifest === undefined) return invalidManifest(manifestPath);
  const sources = await loadSources(manifest, manifestPath, root);
  const registry = await createUiModuleRegistry(sources);
  return resolveRegisteredProject(registry, manifest, manifestPath, root);
}

async function projectRoot(cwd: string | undefined): Promise<string> {
  return realpath(cwd === undefined ? process.cwd() : cwd);
}

async function resolveRegisteredProject(
  registry: Awaited<ReturnType<typeof createUiModuleRegistry>>,
  manifest: UiModuleProjectManifest,
  manifestPath: string,
  root: string
): Promise<ResolveUiModuleProjectResult> {
  if (registry.status === UiModuleRegistryStatus.Rejected)
    return { diagnostics: registry.diagnostics.map(moduleDiagnostic) };
  const resolution = await resolveUiModule(registry.registry, manifest.entry);
  return resolvedProjectResult(resolution, manifest, manifestPath, root);
}

async function resolvedProjectResult(
  resolution: Awaited<ReturnType<typeof resolveUiModule>>,
  manifest: UiModuleProjectManifest,
  manifestPath: string,
  root: string
): Promise<ResolveUiModuleProjectResult> {
  if (resolution.status === UiModuleResolutionStatus.Rejected) {
    return { diagnostics: resolution.diagnostics.map(moduleDiagnostic) };
  }
  return validateResolvedProject(resolution.artifact, manifest, manifestPath, root);
}

async function validateResolvedProject(
  artifact: UiResolvedModuleArtifact,
  manifest: UiModuleProjectManifest,
  manifestPath: string,
  root: string
): Promise<ResolveUiModuleProjectResult> {
  const preparation = prepareUnifoldDocument(artifact.composedDocument);
  if (preparation.status === UnifoldPreparationStatus.Invalid) {
    return { diagnostics: preparation.diagnostics.map(documentDiagnostic) };
  }
  if (preparation.prepared === undefined) {
    return failure(
      UnifoldCliDiagnosticCode.DocumentInvalid,
      "Resolved UiModule document did not produce a prepared artifact.",
      manifestPath
    );
  }
  return {
    project: {
      artifact,
      entry: manifest.entry,
      irIntegrity: await uiModuleIntegrity(preparation.prepared.document),
      manifestPath,
      root
    }
  };
}

async function loadSources(manifest: UiModuleProjectManifest, manifestPath: string, root: string) {
  const base = dirname(manifestPath);
  return Promise.all(
    manifest.sources.map(async (source) => {
      const path = await safeExistingFile(root, base, source, MAXIMUM_SOURCE_BYTES);
      return {
        module: JSON.parse(await readFile(path, "utf8")) as unknown,
        sourceId: sourceId(root, path)
      };
    })
  );
}

async function safeExistingFile(
  root: string,
  base: string,
  input: string,
  maximumBytes: number
): Promise<string> {
  requireSafeRelativePath(input);
  const path = await realpath(resolve(base, input));
  requireContainedPath(root, path, input);
  const metadata = await stat(path);
  requireBoundedFile(metadata, input, maximumBytes);
  return path;
}

function requireSafeRelativePath(input: string): void {
  if (!isSafeRelativePath(input)) throw new Error(`Unsafe relative path: ${input}.`);
}

function requireContainedPath(root: string, path: string, input: string): void {
  if (!isWithin(root, path)) throw new Error(`Path escapes the project root: ${input}.`);
}

function requireBoundedFile(
  metadata: Awaited<ReturnType<typeof stat>>,
  input: string,
  maximumBytes: number
): void {
  if (!metadata.isFile()) throw new Error(`Path is not a file: ${input}.`);
  requireFileSize(metadata.size, input, maximumBytes);
}

function requireFileSize(size: number | bigint, input: string, maximumBytes: number): void {
  if (Number(size) > maximumBytes)
    throw new Error(`Input exceeds ${maximumBytes} bytes: ${input}.`);
}

function parseManifest(content: string): UiModuleProjectManifest | undefined {
  try {
    return manifestValue(JSON.parse(content) as unknown);
  } catch {
    return undefined;
  }
}

function manifestValue(value: unknown): UiModuleProjectManifest | undefined {
  if (!isManifestObject(value)) return undefined;
  const contents = manifestContents(value);
  if (contents === undefined) return undefined;
  return {
    $schema: UnifoldCliModuleProjectSchemaUri.Version1,
    ...contents,
    schemaVersion: UnifoldCliModuleProjectSchemaVersion.Version1
  };
}

function manifestContents(
  value: Record<string, unknown>
): Pick<UiModuleProjectManifest, "entry" | "sources"> | undefined {
  const entry = entryValue(value["entry"]);
  if (entry === undefined) return undefined;
  const sources = sourceValues(value["sources"]);
  if (sources === undefined) return undefined;
  return { entry, sources };
}

function isManifestObject(value: unknown): value is Record<string, unknown> {
  if (!isExactObject(value, ["$schema", "entry", "schemaVersion", "sources"])) return false;
  return [
    value["$schema"] === UI_MODULE_PROJECT_SCHEMA,
    value["schemaVersion"] === UnifoldCliModuleProjectSchemaVersion.Version1
  ].every(Boolean);
}

function entryValue(value: unknown): ResolveUiModuleOptions | undefined {
  if (!isEntryObject(value)) return undefined;
  return {
    exportName: value["exportName"],
    moduleId: value["moduleId"],
    version: value["version"]
  };
}

function isEntryObject(
  value: unknown
): value is Record<"exportName" | "moduleId" | "version", string> {
  if (!isExactObject(value, ["exportName", "moduleId", "version"])) return false;
  return [
    isMatchingString(value["exportName"], exportPattern, 128),
    isMatchingString(value["moduleId"], moduleIdPattern, 128),
    isMatchingString(value["version"], versionPattern, 64)
  ].every(Boolean);
}

function sourceValues(value: unknown): readonly string[] | undefined {
  if (!isBoundedSourceArray(value)) return undefined;
  if (!value.every(isSafeRelativePath)) return undefined;
  return uniqueSources(value);
}

function isBoundedSourceArray(value: unknown): value is unknown[] {
  if (!Array.isArray(value)) return false;
  return value.length >= 1 && value.length <= 128;
}

function uniqueSources(value: readonly string[]): readonly string[] | undefined {
  return new Set(value).size === value.length ? value : undefined;
}

function isExactObject(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null) return false;
  if (typeof value !== "object") return false;
  return !Array.isArray(value);
}

function isMatchingString(value: unknown, pattern: RegExp, maximum: number): value is string {
  return typeof value === "string" && value.length <= maximum && pattern.test(value);
}

function isSafeRelativePath(value: unknown): value is string {
  if (typeof value !== "string") return false;
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

function sourceId(root: string, path: string): string {
  return relative(root, path).replaceAll("\\", "/");
}

function invalidManifest(path: string): ResolveUiModuleProjectResult {
  return failure(
    UnifoldCliDiagnosticCode.ModuleManifestInvalid,
    "UiModule project manifest is malformed or unsupported.",
    path
  );
}

function failure(
  code: UnifoldCliDiagnosticCode,
  message: string,
  path: string
): ResolveUiModuleProjectResult {
  return { diagnostics: [{ code, message, path }] };
}

function moduleDiagnostic(diagnostic: {
  readonly code: string;
  readonly message: string;
  readonly path: string;
  readonly sourceId?: string;
}): UnifoldCliDiagnostic {
  return {
    code: UnifoldCliDiagnosticCode.ModuleInvalid,
    message: diagnostic.message,
    path: diagnostic.path,
    sourceCode: diagnostic.code,
    ...(diagnostic.sourceId === undefined ? {} : { sourceId: diagnostic.sourceId })
  };
}

function documentDiagnostic(diagnostic: UnifoldApplicationDiagnostic): UnifoldCliDiagnostic {
  return {
    code: UnifoldCliDiagnosticCode.DocumentInvalid,
    message: diagnostic.message,
    path: diagnostic.path,
    sourceCode: diagnostic.code,
    stage: diagnostic.stage
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to resolve UiModule project.";
}
