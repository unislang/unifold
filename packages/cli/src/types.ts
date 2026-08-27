import type { UnifoldApplicationDiagnosticStage } from "@unislang/unifold";

import {
  UnifoldCliCommand,
  UnifoldCliDiagnosticCode,
  UnifoldCliGenerator,
  UnifoldCliModuleAction,
  UnifoldCliStatus
} from "./enums.js";

export interface UnifoldCliDiagnostic {
  readonly code: UnifoldCliDiagnosticCode;
  readonly message: string;
  readonly path?: string;
  readonly sourceCode?: string;
  readonly sourceId?: string;
  readonly stage?: UnifoldApplicationDiagnosticStage;
}

export interface UnifoldCliResult {
  readonly diagnostics: readonly UnifoldCliDiagnostic[];
  readonly message: string;
  readonly status: UnifoldCliStatus;
}

export interface ValidateInvocation {
  readonly command: UnifoldCliCommand.Validate;
  readonly inputPath: string;
}

export interface GenerateStarterInvocation {
  readonly command: UnifoldCliCommand.Generate;
  readonly directory: string;
  readonly generator: UnifoldCliGenerator.Starter;
  readonly install: false;
}

export interface ValidateModuleInvocation {
  readonly action: UnifoldCliModuleAction.Validate;
  readonly command: UnifoldCliCommand.Module;
  readonly manifestPath: string;
}

export interface CheckModuleInvocation {
  readonly action: UnifoldCliModuleAction.Check;
  readonly command: UnifoldCliCommand.Module;
  readonly lockPath: string;
  readonly manifestPath: string;
}

export interface FlattenModuleInvocation {
  readonly action: UnifoldCliModuleAction.Flatten;
  readonly command: UnifoldCliCommand.Module;
  readonly lockPath: string;
  readonly manifestPath: string;
  readonly outputPath: string;
}

export type UnifoldCliInvocation =
  | CheckModuleInvocation
  | FlattenModuleInvocation
  | GenerateStarterInvocation
  | ValidateInvocation
  | ValidateModuleInvocation;

export interface UnifoldCliExecutionOptions {
  readonly cwd?: string;
  readonly packageVersion?: string;
}
