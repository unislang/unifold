import { UiCommandType, UiNodeKind } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import {
  REACTIVE_TRANSACTION_CONTROL_COUNT,
  REACTIVE_TRANSACTION_GROUP_ID,
  REACTIVE_TRANSACTION_ROOT_ID,
  REACTIVE_TRANSACTION_RULE_COUNT,
  REACTIVE_TRANSACTION_TARGET_ID,
  createReactiveTransactionHarness,
  executeReactiveTransaction,
  reactiveRuleOutputId,
  type ReactiveTransactionHarness,
  type ReactiveTransactionResult
} from "./reactive-transaction-fixture.js";

it("commits a 100-control aggregate transaction with validation and 20 dependent rules", () => {
  const harness = createReactiveTransactionHarness();
  try {
    const result = executeReactiveTransaction(harness, 7);
    verifyTopology(harness, result);
    verifyValidationAndCommands(result);
    verifyCommittedObservation(harness, result);
  } finally {
    harness.runtime.dispose();
  }
});

function verifyTopology(
  harness: ReactiveTransactionHarness,
  result: ReactiveTransactionResult
): void {
  const controlCount = result.record.changedNodeIds.filter(
    (id) => harness.runtime.getSnapshot(id).kind === UiNodeKind.Control
  ).length;
  const controls = Array.from({ length: REACTIVE_TRANSACTION_CONTROL_COUNT }, (_, index) =>
    harness.runtime.getSnapshot(`field-${index.toString().padStart(5, "0")}`)
  );
  expect(harness.rules).toHaveLength(REACTIVE_TRANSACTION_RULE_COUNT);
  expect(controls).toHaveLength(REACTIVE_TRANSACTION_CONTROL_COUNT);
  expect(controlCount).toBe(1);
  expect(new Set(result.record.changedNodeIds)).toEqual(expectedChangedIds());
}

function verifyValidationAndCommands(result: ReactiveTransactionResult): void {
  expect(result.validationCalls).toEqual([
    REACTIVE_TRANSACTION_TARGET_ID,
    REACTIVE_TRANSACTION_GROUP_ID,
    REACTIVE_TRANSACTION_ROOT_ID
  ]);
  expect(result.commandTypes).toHaveLength(REACTIVE_TRANSACTION_RULE_COUNT + 1);
  expect(result.commandTypes[0]).toBe(UiCommandType.ControlSetValue);
  expect(result.commandTypes.slice(1)).toEqual(
    Array.from({ length: REACTIVE_TRANSACTION_RULE_COUNT }, () => UiCommandType.NodePatchProperties)
  );
}

function verifyCommittedObservation(
  harness: ReactiveTransactionHarness,
  result: ReactiveTransactionResult
): void {
  const finalOutput = harness.runtime.getSnapshot(
    reactiveRuleOutputId(REACTIVE_TRANSACTION_RULE_COUNT - 1)
  );
  expect(finalOutput.properties["value"]).toBe(7 + REACTIVE_TRANSACTION_RULE_COUNT);
  expect(result.observations).toEqual([
    {
      finalRuleValue: 7 + REACTIVE_TRANSACTION_RULE_COUNT,
      revision: result.record.revision,
      targetValue: 7
    }
  ]);
  expect(harness.unrelatedObservations).toEqual([]);
}

function expectedChangedIds(): Set<string> {
  return new Set([
    REACTIVE_TRANSACTION_TARGET_ID,
    REACTIVE_TRANSACTION_GROUP_ID,
    REACTIVE_TRANSACTION_ROOT_ID,
    ...Array.from({ length: REACTIVE_TRANSACTION_RULE_COUNT }, (_, index) =>
      reactiveRuleOutputId(index)
    )
  ]);
}
