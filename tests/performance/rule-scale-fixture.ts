import {
  UiDerivedRuleOutputKind,
  UiDerivedRuleSchemaVersion,
  UiNodeKind,
  type JsonValue,
  type UiDerivedRuleDefinition
} from "@unislang/unifold-contracts";
import { UiCommandType, type UiCommand } from "@unislang/unifold-events";
import {
  compileDerivedRules,
  evaluateAffectedRules,
  type CompiledRuleProgram,
  type RuleDependency,
  type RuleEvaluationPort
} from "@unislang/unifold-rules";

const RULE_CHAIN_COUNT = 40;
export const RULES_PER_CHAIN = 25;
export const RULE_SCALE_COUNT = RULE_CHAIN_COUNT * RULES_PER_CHAIN;

interface RuleScaleHarness {
  readonly program: CompiledRuleProgram;
  readonly state: Map<string, JsonValue>;
}

export function createRuleScaleHarness(): RuleScaleHarness {
  const definitions = ruleDefinitions();
  const result = compileDerivedRules(definitions, ruleNodes());
  if (result.program === undefined) throw new Error(JSON.stringify(result.diagnostics));
  return { program: result.program, state: initialState() };
}

export function evaluateRuleChain(harness: RuleScaleHarness, chainIndex: number, value: number) {
  const root = ruleNodeId(chainIndex, -1);
  const changed = dependency(root);
  harness.state.set(dependencyKey(changed), value);
  return evaluateAffectedRules(harness.program, [changed], evaluationPort(harness.state), {
    maxOutputCommands: RULES_PER_CHAIN,
    maxRuleEvaluations: RULES_PER_CHAIN
  });
}

export function ruleNodeId(chainIndex: number, ruleIndex: number): string {
  const chain = chainIndex.toString().padStart(3, "0");
  if (ruleIndex < 0) return `rule-chain-${chain}-input`;
  return `rule-chain-${chain}-output-${ruleIndex.toString().padStart(3, "0")}`;
}

function ruleDefinitions(): UiDerivedRuleDefinition[] {
  return Array.from({ length: RULE_CHAIN_COUNT }, (_, chainIndex) =>
    Array.from({ length: RULES_PER_CHAIN }, (_, ruleIndex) => ruleDefinition(chainIndex, ruleIndex))
  ).flat();
}

function ruleDefinition(chainIndex: number, ruleIndex: number): UiDerivedRuleDefinition {
  return {
    expression: { "+": [{ var: "value" }, 1] },
    id: `chain-${chainIndex.toString().padStart(3, "0")}-rule-${ruleIndex
      .toString()
      .padStart(3, "0")}`,
    inputs: [
      {
        name: "value",
        nodeId: ruleNodeId(chainIndex, ruleIndex - 1),
        pointer: "/properties/value"
      }
    ],
    output: {
      kind: UiDerivedRuleOutputKind.NodePatchProperty,
      nodeId: ruleNodeId(chainIndex, ruleIndex),
      property: "value"
    },
    schemaVersion: UiDerivedRuleSchemaVersion.Version1,
    version: "1.0.0"
  };
}

function ruleNodes() {
  return Array.from({ length: RULE_CHAIN_COUNT }, (_, chainIndex) =>
    Array.from({ length: RULES_PER_CHAIN + 1 }, (_, offset) => ({
      id: ruleNodeId(chainIndex, offset - 1),
      kind: UiNodeKind.Component
    }))
  ).flat();
}

function initialState(): Map<string, JsonValue> {
  const entries = Array.from({ length: RULE_CHAIN_COUNT }, (_, chainIndex) =>
    Array.from(
      { length: RULES_PER_CHAIN + 1 },
      (_, offset) => [dependencyKey(dependency(ruleNodeId(chainIndex, offset - 1))), 0] as const
    )
  ).flat();
  return new Map(entries);
}

function evaluationPort(state: Map<string, JsonValue>): RuleEvaluationPort {
  return {
    apply: (command) => applyCommand(command, state),
    read: (value) => state.get(dependencyKey(value))
  };
}

function applyCommand(command: UiCommand, state: Map<string, JsonValue>): void {
  if (command.type !== UiCommandType.NodePatchProperties) {
    throw new Error(`Unexpected rule-scale command: ${command.type}.`);
  }
  Object.entries(command.properties).forEach(([property, value]) => {
    state.set(
      dependencyKey({ nodeId: command.id, pointer: `/properties/${property}` }),
      value ?? null
    );
  });
}

function dependency(nodeId: string): RuleDependency {
  return { nodeId, pointer: "/properties/value" };
}

function dependencyKey(value: RuleDependency): string {
  return JSON.stringify([value.nodeId, value.pointer]);
}
