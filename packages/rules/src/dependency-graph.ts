import type { UiDerivedRuleDefinition } from "@unislang/unifold-contracts";

import { dependencyKey } from "./dependencies.js";
import { RuleDiagnosticCode } from "./enums.js";
import type { RuleDependency, RuleDiagnostic } from "./types.js";

export interface RuleGraphSeed {
  readonly definition: UiDerivedRuleDefinition;
  readonly inputs: readonly RuleDependency[];
  readonly outputs: readonly RuleDependency[];
  readonly primaryOutput: RuleDependency;
  readonly referencedInputs: readonly string[];
}

interface RuleGraphResult {
  readonly diagnostics: readonly RuleDiagnostic[];
  readonly downstreamByRuleId: ReadonlyMap<string, readonly string[]>;
  readonly layerByRuleId: ReadonlyMap<string, number>;
}

interface MutableGraph {
  readonly downstream: Map<string, Set<string>>;
  readonly indegree: Map<string, number>;
}

interface RuleInputIndex {
  readonly descendants: Map<string, Set<string>>;
  readonly exact: Map<string, Set<string>>;
}

export function buildRuleDependencyGraph(seeds: readonly RuleGraphSeed[]): RuleGraphResult {
  const diagnostics = conflictingWriterDiagnostics(seeds);
  const graph = createGraph(seeds);
  connectGraph(seeds, graph);
  const layers = topologicalLayers(graph);
  if (layers.size !== seeds.length) diagnostics.push(cycleDiagnostic());
  return {
    diagnostics,
    downstreamByRuleId: frozenDownstream(graph.downstream),
    layerByRuleId: layers
  };
}

function createGraph(seeds: readonly RuleGraphSeed[]): MutableGraph {
  return {
    downstream: new Map(seeds.map(({ definition }) => [definition.id, new Set()])),
    indegree: new Map(seeds.map(({ definition }) => [definition.id, 0]))
  };
}

function connectGraph(seeds: readonly RuleGraphSeed[], graph: MutableGraph): void {
  const index = createRuleInputIndex(seeds);
  seeds.forEach((producer) => connectProducer(producer, index, graph));
}

function createRuleInputIndex(seeds: readonly RuleGraphSeed[]): RuleInputIndex {
  const index = {
    descendants: new Map<string, Set<string>>(),
    exact: new Map<string, Set<string>>()
  };
  seeds.forEach((seed) =>
    seed.inputs.forEach((input) => indexInput(seed.definition.id, input, index))
  );
  return index;
}

function indexInput(ruleId: string, input: RuleDependency, index: RuleInputIndex): void {
  addIndexedId(index.exact, dependencyKey(input), ruleId);
  dependencyLineage(input).forEach((dependency) =>
    addIndexedId(index.descendants, dependencyKey(dependency), ruleId)
  );
}

function connectProducer(
  producer: RuleGraphSeed,
  index: RuleInputIndex,
  graph: MutableGraph
): void {
  producer.outputs.forEach((output) =>
    candidateRuleIds(output, index).forEach((consumerId) =>
      addEdge(producer.definition.id, consumerId, graph)
    )
  );
}

function candidateRuleIds(output: RuleDependency, index: RuleInputIndex): ReadonlySet<string> {
  const candidates = new Set(index.descendants.get(dependencyKey(output)) ?? []);
  dependencyLineage(output).forEach((dependency) =>
    addExistingIds(candidates, index.exact.get(dependencyKey(dependency)))
  );
  return candidates;
}

function dependencyLineage(dependency: RuleDependency): RuleDependency[] {
  return pointerLineage(dependency.pointer).map((pointer) => ({
    nodeId: dependency.nodeId,
    pointer
  }));
}

function pointerLineage(pointer: string): string[] {
  const values = [pointer];
  let current = pointer;
  while (current.lastIndexOf("/") > 0) {
    current = current.slice(0, current.lastIndexOf("/"));
    values.push(current);
  }
  return values;
}

function addIndexedId(index: Map<string, Set<string>>, key: string, ruleId: string): void {
  const ids = index.get(key) ?? new Set<string>();
  ids.add(ruleId);
  index.set(key, ids);
}

function addExistingIds(target: Set<string>, values: ReadonlySet<string> | undefined): void {
  values?.forEach((value) => target.add(value));
}

function addEdge(producerId: string, consumerId: string, graph: MutableGraph): void {
  const consumers = graph.downstream.get(producerId);
  if (consumers === undefined) return;
  if (consumers.has(consumerId)) return;
  consumers.add(consumerId);
  incrementIndegree(consumerId, graph.indegree);
}

function incrementIndegree(ruleId: string, indegree: Map<string, number>): void {
  indegree.set(ruleId, (indegree.get(ruleId) ?? 0) + 1);
}

function topologicalLayers(graph: MutableGraph): ReadonlyMap<string, number> {
  const remaining = new Map(graph.indegree);
  const layers = new Map<string, number>();
  let pending = zeroIndegreeIds(remaining);
  let layer = 0;
  while (pending.length > 0) {
    const current = pending;
    pending = [];
    current.forEach((id) => releaseRule(id, layer, graph.downstream, remaining, pending, layers));
    pending.sort();
    layer += 1;
  }
  return layers;
}

function releaseRule(
  id: string,
  layer: number,
  downstream: ReadonlyMap<string, ReadonlySet<string>>,
  remaining: Map<string, number>,
  pending: string[],
  layers: Map<string, number>
): void {
  remaining.delete(id);
  layers.set(id, layer);
  downstream.get(id)?.forEach((consumer) => releaseEdge(consumer, remaining, pending));
}

function releaseEdge(consumer: string, remaining: Map<string, number>, pending: string[]): void {
  const next = (remaining.get(consumer) ?? 0) - 1;
  remaining.set(consumer, next);
  if (next === 0) pending.push(consumer);
}

function zeroIndegreeIds(indegree: ReadonlyMap<string, number>): string[] {
  return [...indegree]
    .filter(([, count]) => count === 0)
    .map(([id]) => id)
    .sort();
}

function conflictingWriterDiagnostics(seeds: readonly RuleGraphSeed[]): RuleDiagnostic[] {
  const diagnostics: RuleDiagnostic[] = [];
  const writers = new Map<string, RuleGraphSeed>();
  seeds.forEach((seed) => indexWriter(seed, writers, diagnostics));
  return diagnostics;
}

function indexWriter(
  seed: RuleGraphSeed,
  writers: Map<string, RuleGraphSeed>,
  diagnostics: RuleDiagnostic[]
): void {
  const key = dependencyKey(seed.primaryOutput);
  const existing = writers.get(key);
  if (existing === undefined) return void writers.set(key, seed);
  diagnostics.push({
    code: RuleDiagnosticCode.MultipleWriters,
    message: `Rules ${existing.definition.id} and ${seed.definition.id} write the same state path.`,
    path: "/rules",
    ruleId: seed.definition.id
  });
}

function cycleDiagnostic(): RuleDiagnostic {
  return {
    code: RuleDiagnosticCode.Cycle,
    message: "Derived rule dependencies contain a cycle.",
    path: "/rules"
  };
}

function frozenDownstream(
  downstream: ReadonlyMap<string, ReadonlySet<string>>
): ReadonlyMap<string, readonly string[]> {
  return new Map([...downstream].map(([id, values]) => [id, [...values].sort()] as const));
}
