import { parseUnifoldCliArguments } from "./arguments.js";
import { UnifoldCliCommand, UnifoldCliDiagnosticCode } from "./enums.js";
import { readCliPackageVersion } from "./package-version.js";
import { cliFailure } from "./result.js";
import { generateUnifoldStarter } from "./starter.js";
import { runUiModuleCommand } from "./module-command.js";
import type {
  GenerateStarterInvocation,
  UnifoldCliExecutionOptions,
  UnifoldCliResult
} from "./types.js";
import { validateUnifoldDocument } from "./validate.js";

export async function runUnifoldCli(
  arguments_: readonly string[],
  options: UnifoldCliExecutionOptions = {}
): Promise<UnifoldCliResult> {
  try {
    return await executeUnifoldCli(arguments_, options);
  } catch (error) {
    return cliFailure("Unifold CLI execution failed.", [
      {
        code: UnifoldCliDiagnosticCode.StarterGenerationFailed,
        message: errorMessage(error)
      }
    ]);
  }
}

function executeUnifoldCli(
  arguments_: readonly string[],
  options: UnifoldCliExecutionOptions
): Promise<UnifoldCliResult> {
  const parsed = parseUnifoldCliArguments(arguments_);
  if ("diagnostic" in parsed)
    return Promise.resolve(cliFailure("Invalid Unifold CLI invocation.", [parsed.diagnostic]));
  return executeInvocation(parsed.invocation, options);
}

function executeInvocation(
  invocation: import("./types.js").UnifoldCliInvocation,
  options: UnifoldCliExecutionOptions
): Promise<UnifoldCliResult> {
  if (invocation.command === UnifoldCliCommand.Generate) return runStarter(invocation, options);
  if (invocation.command === UnifoldCliCommand.Module) {
    return runUiModuleCommand(invocation, options.cwd);
  }
  return runValidation(invocation, options);
}

async function runStarter(
  invocation: GenerateStarterInvocation,
  options: UnifoldCliExecutionOptions
): Promise<UnifoldCliResult> {
  const packageVersion = options.packageVersion ?? (await readCliPackageVersion());
  return generateUnifoldStarter(invocation.directory, starterOptions(packageVersion, options));
}

function runValidation(
  invocation: { readonly inputPath: string },
  options: UnifoldCliExecutionOptions
): Promise<UnifoldCliResult> {
  return validateUnifoldDocument(invocation.inputPath, options.cwd);
}

function starterOptions(
  packageVersion: string,
  options: UnifoldCliExecutionOptions
): { readonly cwd?: string; readonly packageVersion: string } {
  if (options.cwd === undefined) return { packageVersion };
  return { cwd: options.cwd, packageVersion };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown CLI execution error.";
}
