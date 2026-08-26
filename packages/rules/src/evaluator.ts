import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";
import type { UiCommand } from "@unislang/unifold-events";

import { createDerivedRuleCommand } from "./command.js";
import { dependenciesOverlap } from "./dependencies.js";
import { runJsonLogic } from "./engine.js";
import { RuleEvaluationStatus } from "./enums.js";
import type {
  CompiledDerivedRule,
  CompiledRuleProgram,
  RuleDependency,
  RuleEvaluationOptions,
  RuleEvaluationPort,
  RuleEvaluationResult
} from "./types.js";

const DEFAULT_MAX_OUTPUT_COMMANDS = 256;
const DEFAULT_MAX_RULE_EVALUATIONS = 1_000;

export class RuleEvaluationError extends Error {
  constructor(
    message: string,
    readonly status: RuleEvaluationStatus.BudgetExceeded | RuleEvaluationStatus.Failed
  ) {
    super(message);
    this.name = "RuleEvaluationError";
  }
}

export function evaluateAffectedRules(
  program: CompiledRuleProgram,
  changed: readonly RuleDependency[],
  port: RuleEvaluationPort,
  options: RuleEvaluationOptions = {}
): RuleEvaluationResult {
  const rules = affectedRules(program, changed);
  const limits = evaluationLimits(options);
  assertEvaluationBudget(rules.length, limits.maxRuleEvaluations);
  return evaluateRules(rules, port, limits.maxOutputCommands);
}

function evaluationLimits(options: RuleEvaluationOptions): Required<RuleEvaluationOptions> {
  return {
    maxOutputCommands: withDefault(options.maxOutputCommands, DEFAULT_MAX_OUTPUT_COMMANDS),
    maxRuleEvaluations: withDefault(options.maxRuleEvaluations, DEFAULT_MAX_RULE_EVALUATIONS)
  };
}

function withDefault(value: number | undefined, fallback: number): number {
  return value ?? fallback;
}

function evaluateRules(
  rules: readonly CompiledDerivedRule[],
  port: RuleEvaluationPort,
  maxOutputCommands: number
): RuleEvaluationResult {
  const commands: UiCommand[] = [];
  const evaluatedRuleIds: string[] = [];
  rules.forEach((rule) => evaluateRule(rule, port, commands, evaluatedRuleIds, maxOutputCommands));
  return { commands, evaluatedRuleIds, status: RuleEvaluationStatus.Applied };
}

function evaluateRule(
  rule: CompiledDerivedRule,
  port: RuleEvaluationPort,
  commands: UiCommand[],
  evaluatedRuleIds: string[],
  maxOutputCommands: number
): void {
  evaluatedRuleIds.push(rule.definition.id);
  const value = safeRun(rule, inputData(rule, port));
  if (sameJsonValue(value, port.read(rule.primaryOutput))) return;
  assertOutputBudget(commands.length + 1, maxOutputCommands);
  const command = safeCommand(rule, value);
  port.apply(command);
  commands.push(command);
}

function inputData(rule: CompiledDerivedRule, port: RuleEvaluationPort): JsonObject {
  return Object.fromEntries(
    rule.definition.inputs.map((input) => [
      input.name,
      port.read({ nodeId: input.nodeId, pointer: input.pointer }) ?? null
    ])
  );
}

function safeRun(rule: CompiledDerivedRule, data: JsonObject): JsonValue {
  try {
    return runJsonLogic(rule.definition.expression, data);
  } catch (error) {
    throw failedRule(rule.definition.id, error);
  }
}

function safeCommand(rule: CompiledDerivedRule, value: JsonValue): UiCommand {
  try {
    return createDerivedRuleCommand(rule.definition.output, value);
  } catch (error) {
    throw failedRule(rule.definition.id, error);
  }
}

function failedRule(ruleId: string, error: unknown): RuleEvaluationError {
  const reason = error instanceof Error ? error.message : "Unknown evaluation failure.";
  return new RuleEvaluationError(`Rule ${ruleId} failed: ${reason}`, RuleEvaluationStatus.Failed);
}

function affectedRules(
  program: CompiledRuleProgram,
  changed: readonly RuleDependency[]
): readonly CompiledDerivedRule[] {
  const ids = initialRuleIds(program, changed);
  const pending = [...ids];
  while (pending.length > 0) addDownstream(program, pending, ids);
  return program.rules.filter((rule) => ids.has(rule.definition.id));
}

function initialRuleIds(
  program: CompiledRuleProgram,
  changed: readonly RuleDependency[]
): Set<string> {
  const ids = new Set<string>();
  changed.forEach((dependency) =>
    program.rulesByNodeId
      .get(dependency.nodeId)
      ?.forEach((id) => addIfAffected(program, id, dependency, ids))
  );
  return ids;
}

function addIfAffected(
  program: CompiledRuleProgram,
  id: string,
  changed: RuleDependency,
  target: Set<string>
): void {
  const rule = program.rulesById.get(id);
  if (rule?.inputDependencies.some((input) => dependenciesOverlap(input, changed))) target.add(id);
}

function addDownstream(program: CompiledRuleProgram, pending: string[], target: Set<string>): void {
  const id = pending.shift();
  if (id === undefined) return;
  program.rulesById.get(id)?.downstreamRuleIds.forEach((next) => addPending(next, pending, target));
}

function addPending(id: string, pending: string[], target: Set<string>): void {
  if (target.has(id)) return;
  target.add(id);
  pending.push(id);
}

function sameJsonValue(left: JsonValue, right: JsonValue | undefined): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertEvaluationBudget(count: number, maximum: number): void {
  if (count <= maximum) return;
  throw new RuleEvaluationError(
    "Rule evaluation budget exceeded.",
    RuleEvaluationStatus.BudgetExceeded
  );
}

function assertOutputBudget(count: number, maximum: number): void {
  if (count <= maximum) return;
  throw new RuleEvaluationError(
    "Rule output command budget exceeded.",
    RuleEvaluationStatus.BudgetExceeded
  );
}
