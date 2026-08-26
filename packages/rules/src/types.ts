import type {
  JsonObject,
  JsonValue,
  UiDerivedRuleDefinition,
  UiNodeKind
} from "@unislang/unifold-contracts";
import type { UiCommand } from "@unislang/unifold-events";

import type { RuleCompilationStatus, RuleDiagnosticCode, RuleEvaluationStatus } from "./enums.js";

export interface RuleDependency {
  readonly nodeId: string;
  readonly pointer: string;
}

export interface RuleCompileNode {
  readonly id: string;
  readonly kind: UiNodeKind;
}

export interface RuleDiagnostic {
  readonly code: RuleDiagnosticCode;
  readonly message: string;
  readonly path: string;
  readonly ruleId?: string;
}

export interface RuleExpressionAnalysis {
  readonly diagnostics: readonly RuleDiagnostic[];
  readonly maxDepth: number;
  readonly nodeCount: number;
  readonly referencedInputs: readonly string[];
}

export interface CompiledDerivedRule {
  readonly definition: UiDerivedRuleDefinition;
  readonly downstreamRuleIds: readonly string[];
  readonly inputDependencies: readonly RuleDependency[];
  readonly layer: number;
  readonly outputDependencies: readonly RuleDependency[];
  readonly primaryOutput: RuleDependency;
  readonly referencedInputs: readonly string[];
}

export interface CompiledRuleProgram {
  readonly rules: readonly CompiledDerivedRule[];
  readonly rulesById: ReadonlyMap<string, CompiledDerivedRule>;
  readonly rulesByNodeId: ReadonlyMap<string, readonly string[]>;
}

export interface RuleCompileResult {
  readonly diagnostics: readonly RuleDiagnostic[];
  readonly program?: CompiledRuleProgram;
  readonly status: RuleCompilationStatus;
}

export interface RuleCompileOptions {
  readonly maxExpressionDepth?: number;
  readonly maxExpressionNodes?: number;
  readonly maxRules?: number;
}

export interface RuleEvaluationPort {
  apply(command: UiCommand): void;
  read(dependency: RuleDependency): JsonValue | undefined;
}

export interface RuleEvaluationOptions {
  readonly maxOutputCommands?: number;
  readonly maxRuleEvaluations?: number;
}

export interface RuleEvaluationResult {
  readonly commands: readonly UiCommand[];
  readonly error?: string;
  readonly evaluatedRuleIds: readonly string[];
  readonly status: RuleEvaluationStatus;
}

export type RuleInputData = JsonObject;
