import { get } from "@sagold/json-pointer";
import type { JsonValue, UiDerivedRuleDefinition } from "@unislang/unifold-contracts";
import type { UiCommand, UiNodeSnapshot } from "@unislang/unifold-events";
import type { UiValidatorRegistryPort } from "@unislang/unifold-forms";
import { NormalizedNodeStore, type UiNodeTransactionDraft } from "@unislang/unifold-reactivity";
import {
  RuleCompilationStatus,
  compileDerivedRules,
  evaluateAffectedRules,
  type CompiledRuleProgram,
  type RuleDependency,
  type RuleEvaluationOptions
} from "@unislang/unifold-rules";

import { applyStateCommand } from "./command-handlers.js";
import { storeOptions } from "./runtime-helpers.js";

export function compileRuntimeDerivedRules(
  definitions: readonly UiDerivedRuleDefinition[] | undefined,
  nodes: readonly UiNodeSnapshot[]
): CompiledRuleProgram | undefined {
  const present = presentDefinitions(definitions);
  if (present === undefined) return undefined;
  const result = compileDerivedRules(
    present,
    nodes.map(({ id, kind }) => ({ id, kind }))
  );
  return requireProgram(result);
}

function presentDefinitions(
  definitions: readonly UiDerivedRuleDefinition[] | undefined
): readonly UiDerivedRuleDefinition[] | undefined {
  if (definitions === undefined) return undefined;
  if (definitions.length === 0) return undefined;
  return definitions;
}

function requireProgram(result: ReturnType<typeof compileDerivedRules>): CompiledRuleProgram {
  if (result.status === RuleCompilationStatus.Invalid) throw invalidRules(result.diagnostics);
  if (result.program === undefined) throw invalidRules(result.diagnostics);
  return result.program;
}

export function applyRuntimeDerivedRules(
  program: CompiledRuleProgram,
  changed: readonly RuleDependency[],
  draft: UiNodeTransactionDraft,
  validators: UiValidatorRegistryPort,
  options: RuleEvaluationOptions = {}
): readonly UiCommand[] {
  return evaluateAffectedRules(
    program,
    changed,
    {
      apply: (command) => applyStateCommand(draft, command, validators),
      read: (dependency) => readDependency(draft, dependency)
    },
    options
  ).commands;
}

export function createRuntimeNodeStore(
  nodes: readonly UiNodeSnapshot[],
  program: CompiledRuleProgram | undefined,
  validators: UiValidatorRegistryPort,
  transactionRetention?: number
): NormalizedNodeStore {
  const options = storeOptions(validators, transactionRetention);
  const initializer = ruleInitializer(program, validators);
  return initializer === undefined
    ? new NormalizedNodeStore(nodes, options)
    : new NormalizedNodeStore(nodes, { ...options, initializer });
}

function ruleInitializer(
  program: CompiledRuleProgram | undefined,
  validators: UiValidatorRegistryPort
): ((draft: UiNodeTransactionDraft) => void) | undefined {
  if (program === undefined) return undefined;
  const dependencies = allInputDependencies(program);
  const budget = Math.max(program.rules.length, 1);
  return (draft) => {
    applyRuntimeDerivedRules(program, dependencies, draft, validators, {
      maxOutputCommands: budget,
      maxRuleEvaluations: budget
    });
  };
}

function allInputDependencies(program: CompiledRuleProgram): RuleDependency[] {
  const dependencies = program.rules.flatMap(({ inputDependencies }) => inputDependencies);
  const unique = new Map(dependencies.map((value) => [JSON.stringify(value), value]));
  return [...unique.values()];
}

function readDependency(
  draft: UiNodeTransactionDraft,
  dependency: RuleDependency
): JsonValue | undefined {
  try {
    return get<JsonValue>(draft.getSnapshot(dependency.nodeId), dependency.pointer);
  } catch {
    return undefined;
  }
}

function invalidRules(diagnostics: unknown): Error {
  return new Error(`Invalid runtime derived rules: ${JSON.stringify(diagnostics)}`);
}
