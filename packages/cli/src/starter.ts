import { mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { UnifoldCliDiagnosticCode, UnifoldCliStatus } from "./enums.js";
import { cliFailure, cliSuccess } from "./result.js";
import { createStarterManifest } from "./starter-manifest.js";
import { resolveStarterTarget, type SafeStarterTarget } from "./starter-path.js";
import { copyStarterTemplate, materializeStarterTemplate } from "./starter-template.js";
import type { UnifoldCliResult } from "./types.js";

export interface GenerateStarterOptions {
  readonly cwd?: string;
  readonly packageVersion: string;
  readonly templateUrl?: URL;
}

export async function generateUnifoldStarter(
  directory: string,
  options: GenerateStarterOptions
): Promise<UnifoldCliResult> {
  const target = await resolveStarterTarget(directory, starterCwd(options));
  if (isCliResult(target)) return target;
  const stage = await mkdtemp(join(target.parent, ".unifold-starter-"));
  try {
    await writeStarter(stage, target, options);
    await rename(stage, target.path);
    return cliSuccess(`Created Unifold starter: ${target.path}`);
  } catch (error) {
    return generationFailure(target.path, error);
  } finally {
    await rm(stage, { force: true, recursive: true });
  }
}

function starterCwd(options: GenerateStarterOptions): string {
  return options.cwd === undefined ? process.cwd() : options.cwd;
}

async function writeStarter(
  stage: string,
  target: SafeStarterTarget,
  options: GenerateStarterOptions
): Promise<void> {
  const template = options.templateUrl ?? new URL("../templates/vanilla/", import.meta.url);
  await copyStarterTemplate(template, stage);
  await materializeStarterTemplate(stage);
  const manifest = createStarterManifest({
    packageName: target.packageName,
    unifoldVersion: options.packageVersion
  });
  await writeFile(join(stage, "package.json"), manifest, { flag: "wx" });
}

function generationFailure(path: string, error: unknown): UnifoldCliResult {
  const code =
    errorCode(error) === "EEXIST"
      ? UnifoldCliDiagnosticCode.StarterTargetExists
      : UnifoldCliDiagnosticCode.StarterGenerationFailed;
  return cliFailure("Unable to generate the Unifold starter.", [
    { code, message: errorMessage(error), path }
  ]);
}

function isCliResult(value: SafeStarterTarget | UnifoldCliResult): value is UnifoldCliResult {
  return "status" in value && value.status === UnifoldCliStatus.Failed;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown starter generation error.";
}

function errorCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  const code = Reflect.get(error, "code");
  return typeof code === "string" ? code : undefined;
}

function isRecord(value: unknown): value is object {
  return value !== null && typeof value === "object";
}
