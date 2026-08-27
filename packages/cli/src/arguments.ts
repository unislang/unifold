import { parseArgs } from "node:util";

import {
  UnifoldCliCommand,
  UnifoldCliDiagnosticCode,
  UnifoldCliGenerator,
  UnifoldCliModuleAction
} from "./enums.js";
import type { UnifoldCliDiagnostic, UnifoldCliInvocation } from "./types.js";

export type ParseInvocationResult =
  | { readonly diagnostic: UnifoldCliDiagnostic }
  | { readonly invocation: UnifoldCliInvocation };

type InvocationParser = (
  subject: string | undefined,
  target: string | undefined,
  parsed: ReturnType<typeof parseArgs>
) => ParseInvocationResult;

const COMMAND_PARSERS: Readonly<Record<string, InvocationParser>> = {
  [UnifoldCliCommand.Generate]: generateInvocation,
  [UnifoldCliCommand.Module]: moduleInvocation,
  [UnifoldCliCommand.Validate]: validateInvocation
};

export function parseUnifoldCliArguments(arguments_: readonly string[]): ParseInvocationResult {
  try {
    return parseInvocation(arguments_);
  } catch (error) {
    return { diagnostic: invalidInvocation(errorMessage(error)) };
  }
}

function parseInvocation(arguments_: readonly string[]): ParseInvocationResult {
  const parsed = parseArgs({
    allowPositionals: true,
    args: [...arguments_],
    options: {
      lock: { type: "string" },
      "no-install": { type: "boolean" },
      output: { type: "string" }
    },
    strict: true
  });
  const [command, subject, target, ...extra] = parsed.positionals;
  if (extra.length > 0) return invalidResult("Too many positional arguments.");
  const parser = commandParser(command);
  if (parser === undefined) return invalidResult("Expected validate, module, or generate command.");
  return parser(subject, target, parsed);
}

function commandParser(command: string | undefined): InvocationParser | undefined {
  return command === undefined ? undefined : COMMAND_PARSERS[command];
}

function validateInvocation(
  inputPath: string | undefined,
  extra: string | undefined,
  parsed: ReturnType<typeof parseArgs>
): ParseInvocationResult {
  const problem = firstProblem([
    issue(inputPath === undefined, "Usage: unifold validate <json>."),
    issue(extra !== undefined, "Usage: unifold validate <json>."),
    issue(
      parsed.values["no-install"] !== undefined,
      "--no-install applies only to starter generation."
    ),
    moduleOptionIssue(parsed, "Document validation does not accept --output or --lock.")
  ]);
  if (problem !== undefined) return invalidResult(problem);
  return {
    invocation: { command: UnifoldCliCommand.Validate, inputPath: requiredValue(inputPath) }
  };
}

function generateInvocation(
  generator: string | undefined,
  directory: string | undefined,
  parsed: ReturnType<typeof parseArgs>
): ParseInvocationResult {
  const problem = firstProblem([
    issue(
      generator !== UnifoldCliGenerator.Starter,
      "Usage: unifold generate starter <directory> --no-install."
    ),
    issue(directory === undefined, "Usage: unifold generate starter <directory> --no-install."),
    issue(
      parsed.values["no-install"] !== true,
      "Starter generation currently requires --no-install."
    ),
    moduleOptionIssue(parsed, "Starter generation does not accept --output or --lock.")
  ]);
  if (problem !== undefined) return invalidResult(problem);
  return {
    invocation: {
      command: UnifoldCliCommand.Generate,
      directory: requiredValue(directory),
      generator: UnifoldCliGenerator.Starter,
      install: false
    }
  };
}

function moduleInvocation(
  action: string | undefined,
  manifestPath: string | undefined,
  parsed: ReturnType<typeof parseArgs>
): ParseInvocationResult {
  const common = moduleInvocationProblem(action, manifestPath, parsed);
  if (common !== undefined) return invalidResult(common);
  return action === UnifoldCliModuleAction.Validate
    ? validateModuleInvocation(requiredValue(manifestPath), parsed)
    : flattenModuleInvocation(requiredValue(manifestPath), parsed);
}

function validateModuleInvocation(
  manifestPath: string,
  parsed: ReturnType<typeof parseArgs>
): ParseInvocationResult {
  const problem = moduleOptionIssue(parsed, "Module validation does not accept output paths.");
  if (problem !== undefined) return invalidResult(problem);
  return {
    invocation: {
      action: UnifoldCliModuleAction.Validate,
      command: UnifoldCliCommand.Module,
      manifestPath
    }
  };
}

function moduleInvocationProblem(
  action: string | undefined,
  manifestPath: string | undefined,
  parsed: ReturnType<typeof parseArgs>
): string | undefined {
  return firstProblem([
    issue(
      action !== UnifoldCliModuleAction.Validate && action !== UnifoldCliModuleAction.Flatten,
      "Usage: unifold module <validate|flatten> <manifest>."
    ),
    issue(manifestPath === undefined, "A module manifest path is required."),
    issue(parsed.values["no-install"] !== undefined, "--no-install applies only to generation.")
  ]);
}

function flattenModuleInvocation(
  manifestPath: string,
  parsed: ReturnType<typeof parseArgs>
): ParseInvocationResult {
  const outputPath = stringOption(parsed.values["output"]);
  const lockPath = stringOption(parsed.values["lock"]);
  const problem = firstProblem([
    issue(outputPath === undefined, "Module flattening requires --output <json>."),
    issue(lockPath === undefined, "Module flattening requires --lock <json>.")
  ]);
  if (problem !== undefined) return invalidResult(problem);
  return {
    invocation: {
      action: UnifoldCliModuleAction.Flatten,
      command: UnifoldCliCommand.Module,
      lockPath: requiredValue(lockPath),
      manifestPath,
      outputPath: requiredValue(outputPath)
    }
  };
}

function moduleOptionIssue(
  parsed: ReturnType<typeof parseArgs>,
  message: string
): string | undefined {
  return issue(
    parsed.values["output"] !== undefined || parsed.values["lock"] !== undefined,
    message
  );
}

function issue(condition: boolean, message: string): string | undefined {
  return condition ? message : undefined;
}

function firstProblem(problems: readonly (string | undefined)[]): string | undefined {
  return problems.find((problem) => problem !== undefined);
}

function requiredValue(value: string | undefined): string {
  if (value === undefined) throw new Error("Required CLI argument is missing.");
  return value;
}

function stringOption(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function invalidResult(message: string): ParseInvocationResult {
  return { diagnostic: invalidInvocation(message) };
}

function invalidInvocation(message: string): UnifoldCliDiagnostic {
  return { code: UnifoldCliDiagnosticCode.InvocationInvalid, message };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to parse CLI arguments.";
}
