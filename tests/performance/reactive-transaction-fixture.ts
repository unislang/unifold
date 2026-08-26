import {
  UiDerivedRuleOutputKind,
  UiDerivedRuleSchemaVersion,
  UiNodeKind,
  type JsonValue,
  type UiDerivedRuleDefinition
} from "@unislang/unifold-contracts";
import {
  UiCommandType,
  UiEventType,
  type UiEvent,
  type UiNodeSnapshot,
  type UiTransactionRecord
} from "@unislang/unifold-events";
import type { UiValidatorRegistryPort } from "@unislang/unifold-forms";
import { createSelector } from "@unislang/unifold-reactivity";
import { UnifoldRuntime } from "@unislang/unifold-runtime";

import { createAggregateScaleNodes, ONE_HUNDRED_CONTROL_FORM_NODES } from "./scale-fixture.js";

export const REACTIVE_TRANSACTION_CONTROL_COUNT = 100;
export const REACTIVE_TRANSACTION_RULE_COUNT = 20;
export const REACTIVE_TRANSACTION_BENCHMARK_NAME =
  "100 controls with ancestor validation and 20 dependent rules";
export const REACTIVE_TRANSACTION_TARGET_ID = "field-00000";
export const REACTIVE_TRANSACTION_GROUP_ID = "group-000";
export const REACTIVE_TRANSACTION_ROOT_ID = "aggregate-root";

interface CommittedObservation {
  readonly finalRuleValue: JsonValue | undefined;
  readonly revision: number;
  readonly targetValue: JsonValue | undefined;
}

export interface ReactiveTransactionHarness {
  readonly commandTypes: string[];
  readonly observations: CommittedObservation[];
  readonly rules: readonly UiDerivedRuleDefinition[];
  readonly runtime: UnifoldRuntime;
  readonly unrelatedObservations: number[];
  readonly validationCalls: string[];
}

export interface ReactiveTransactionResult {
  readonly commandTypes: readonly string[];
  readonly observations: readonly CommittedObservation[];
  readonly record: UiTransactionRecord;
  readonly validationCalls: readonly string[];
}

export function createReactiveTransactionHarness(): ReactiveTransactionHarness {
  const formNodes = createAggregateScaleNodes(ONE_HUNDRED_CONTROL_FORM_NODES, 10);
  const rules = reactiveRules();
  const diagnostics = emptyDiagnostics();
  const runtime = createReactiveRuntime(formNodes, rules, diagnostics.validationCalls);
  const harness = {
    ...diagnostics,
    rules,
    runtime
  };
  attachDiagnostics(harness);
  resetDiagnostics(harness);
  return harness;
}

export function executeReactiveTransaction(
  harness: ReactiveTransactionHarness,
  value: number
): ReactiveTransactionResult {
  resetDiagnostics(harness);
  const record = harness.runtime.execute(
    [{ id: REACTIVE_TRANSACTION_TARGET_ID, type: UiCommandType.ControlSetValue, value }],
    {
      causationId: `reactive-${value}`,
      correlationId: `reactive-${value}`,
      transactionId: `reactive-${value}`
    }
  );
  return {
    commandTypes: [...harness.commandTypes],
    observations: [...harness.observations],
    record,
    validationCalls: [...harness.validationCalls]
  };
}

export function reactiveRuleOutputId(index: number): string {
  return `reactive-rule-output-${index.toString().padStart(2, "0")}`;
}

function resetDiagnostics(harness: ReactiveTransactionHarness): void {
  harness.commandTypes.length = 0;
  harness.observations.length = 0;
  harness.unrelatedObservations.length = 0;
  harness.validationCalls.length = 0;
}

function emptyDiagnostics() {
  return {
    commandTypes: [] as string[],
    observations: [] as CommittedObservation[],
    unrelatedObservations: [] as number[],
    validationCalls: [] as string[]
  };
}

function createReactiveRuntime(
  formNodes: readonly UiNodeSnapshot[],
  rules: readonly UiDerivedRuleDefinition[],
  validationCalls: string[]
): UnifoldRuntime {
  let generatedId = 0;
  return new UnifoldRuntime({
    createId: () => `reactive-event-${++generatedId}`,
    documentId: "reactive-transaction-performance",
    initialNodes: [...formNodes, ...ruleOutputNodes(formNodes[0])],
    now: () => "2026-08-25T00:00:00.000Z",
    rules,
    transactionRetention: 1,
    validatorRegistry: recordingValidator(validationCalls)
  });
}

function attachDiagnostics(harness: ReactiveTransactionHarness): void {
  harness.runtime.events$.subscribe((event) => recordCommand(event, harness.commandTypes));
  harness.runtime
    .select(createSelector((state) => committedObservation(state), committedSelectionIds()))
    .subscribe((value) => harness.observations.push(value));
  harness.runtime
    .select(createSelector((state) => state.revision, ["field-00001"]))
    .subscribe((revision) => harness.unrelatedObservations.push(revision));
}

function recordCommand(event: UiEvent, commandTypes: string[]): void {
  if (event.type !== UiEventType.CommandApplied) return;
  const commandType = eventCommandType(event);
  if (typeof commandType === "string") commandTypes.push(commandType);
}

function eventCommandType(event: UiEvent): unknown {
  const change = event.data.change;
  if (typeof change !== "object") return undefined;
  if (change === null) return undefined;
  return Reflect.get(change, "commandType");
}

function recordingValidator(calls: string[]): UiValidatorRegistryPort {
  return {
    validate(node) {
      calls.push(node.id);
      return [];
    }
  };
}

function reactiveRules(): UiDerivedRuleDefinition[] {
  return Array.from({ length: REACTIVE_TRANSACTION_RULE_COUNT }, (_, index) => ({
    expression: { "+": [{ var: "value" }, 1] },
    id: `reactive-rule-${index.toString().padStart(2, "0")}`,
    inputs: [ruleInput(index)],
    output: {
      kind: UiDerivedRuleOutputKind.NodePatchProperty,
      nodeId: reactiveRuleOutputId(index),
      property: "value"
    },
    schemaVersion: UiDerivedRuleSchemaVersion.Version1,
    version: "1.0.0"
  }));
}

function ruleInput(index: number) {
  if (index === 0) {
    return { name: "value", nodeId: REACTIVE_TRANSACTION_TARGET_ID, pointer: "/control/value" };
  }
  return {
    name: "value",
    nodeId: reactiveRuleOutputId(index - 1),
    pointer: "/properties/value"
  };
}

function ruleOutputNodes(template: UiNodeSnapshot | undefined): UiNodeSnapshot[] {
  if (template === undefined) throw new Error("The reactive transaction fixture requires a form.");
  return Array.from({ length: REACTIVE_TRANSACTION_RULE_COUNT }, (_, index) =>
    ruleOutputNode(template, index)
  );
}

function ruleOutputNode(template: UiNodeSnapshot, index: number): UiNodeSnapshot {
  const id = reactiveRuleOutputId(index);
  return {
    attributes: {},
    base: template.base,
    definitionVersion: template.definitionVersion,
    id,
    instanceId: id,
    kind: UiNodeKind.Component,
    properties: { value: 0 },
    revision: 0,
    scopePath: [id],
    type: "DerivedValue"
  };
}

function committedSelectionIds(): string[] {
  return [
    REACTIVE_TRANSACTION_TARGET_ID,
    REACTIVE_TRANSACTION_GROUP_ID,
    REACTIVE_TRANSACTION_ROOT_ID,
    reactiveRuleOutputId(REACTIVE_TRANSACTION_RULE_COUNT - 1)
  ];
}

function committedObservation(state: {
  readonly revision: number;
  readonly nodes: Readonly<Record<string, UiNodeSnapshot>>;
}): CommittedObservation {
  return {
    finalRuleValue: nodeProperty(
      state.nodes,
      reactiveRuleOutputId(REACTIVE_TRANSACTION_RULE_COUNT - 1),
      "value"
    ),
    revision: state.revision,
    targetValue: controlValue(state.nodes, REACTIVE_TRANSACTION_TARGET_ID)
  };
}

function nodeProperty(
  nodes: Readonly<Record<string, UiNodeSnapshot>>,
  id: string,
  property: string
): JsonValue | undefined {
  return nodes[id]?.properties[property];
}

function controlValue(
  nodes: Readonly<Record<string, UiNodeSnapshot>>,
  id: string
): JsonValue | undefined {
  return nodes[id]?.control?.value;
}
