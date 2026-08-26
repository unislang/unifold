import type { UiDerivedRuleDefinition } from "@unislang/unifold-contracts";

import { buildRuleDependencyGraph, type RuleGraphSeed } from "./dependency-graph.js";
import { RuleCompilationStatus } from "./enums.js";
import {
  compileRuleSeed,
  createRuleValidationContext,
  validateRuleCollection
} from "./rule-validation.js";
import type {
  CompiledDerivedRule,
  CompiledRuleProgram,
  RuleCompileNode,
  RuleCompileOptions,
  RuleCompileResult,
  RuleDiagnostic
} from "./types.js";

export function compileDerivedRules(
  definitions: readonly UiDerivedRuleDefinition[],
  nodes: readonly RuleCompileNode[],
  options: RuleCompileOptions = {}
): RuleCompileResult {
  const context = createRuleValidationContext(nodes, options);
  validateRuleCollection(definitions, context);
  const seeds = definitions.map((definition, index) => compileRuleSeed(definition, index, context));
  const validSeeds = seeds.filter((seed): seed is RuleGraphSeed => seed !== undefined);
  const graph = buildRuleDependencyGraph(validSeeds);
  context.diagnostics.push(...graph.diagnostics);
  if (context.diagnostics.length > 0) return invalidResult(context.diagnostics);
  return validResult(createProgram(validSeeds, graph.downstreamByRuleId, graph.layerByRuleId));
}

function createProgram(
  seeds: readonly RuleGraphSeed[],
  downstream: ReadonlyMap<string, readonly string[]>,
  layers: ReadonlyMap<string, number>
): CompiledRuleProgram {
  const rules = seeds.map((seed) => compiledRule(seed, downstream, layers)).sort(compareRules);
  return {
    rules,
    rulesById: new Map(rules.map((rule) => [rule.definition.id, rule])),
    rulesByNodeId: indexRulesByNode(rules)
  };
}

function compiledRule(
  seed: RuleGraphSeed,
  downstream: ReadonlyMap<string, readonly string[]>,
  layers: ReadonlyMap<string, number>
): CompiledDerivedRule {
  return {
    definition: seed.definition,
    downstreamRuleIds: downstream.get(seed.definition.id) ?? [],
    inputDependencies: seed.inputs,
    layer: layers.get(seed.definition.id) ?? 0,
    outputDependencies: seed.outputs,
    primaryOutput: seed.primaryOutput,
    referencedInputs: seed.referencedInputs
  };
}

function indexRulesByNode(
  rules: readonly CompiledDerivedRule[]
): ReadonlyMap<string, readonly string[]> {
  const index = new Map<string, Set<string>>();
  rules.forEach((rule) =>
    rule.inputDependencies.forEach((input) =>
      addIndexedRule(index, input.nodeId, rule.definition.id)
    )
  );
  return new Map([...index].map(([id, values]) => [id, [...values].sort()]));
}

function addIndexedRule(index: Map<string, Set<string>>, nodeId: string, ruleId: string): void {
  const values = index.get(nodeId) ?? new Set<string>();
  values.add(ruleId);
  index.set(nodeId, values);
}

function compareRules(left: CompiledDerivedRule, right: CompiledDerivedRule): number {
  return left.layer - right.layer || left.definition.id.localeCompare(right.definition.id);
}

function invalidResult(diagnostics: readonly RuleDiagnostic[]): RuleCompileResult {
  return { diagnostics, status: RuleCompilationStatus.Invalid };
}

function validResult(program: CompiledRuleProgram): RuleCompileResult {
  return { diagnostics: [], program, status: RuleCompilationStatus.Valid };
}
