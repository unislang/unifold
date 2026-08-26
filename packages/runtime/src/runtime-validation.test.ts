import {
  UiCommandType,
  UiControlStatus,
  UiUpdateTrigger,
  type UiCommand,
  type UiTransactionRecord
} from "@unislang/unifold-events";
import type { UiAsyncValidatorRegistryPort } from "@unislang/unifold-forms";
import { expect, it, vi } from "vitest";

import { UiRuntimeValidation } from "./runtime-validation.js";
import { controlNode } from "./runtime.test-data.js";

it("starts and resolves an async validation with a causal request identity", async () => {
  const node = asyncNode("Ada");
  const execute = vi.fn((commands: readonly UiCommand[]) => applyPending(node, commands[0]));
  const validation = new UiRuntimeValidation(validRegistry(), ids(), () => node, execute);

  validation.afterCommit(
    [{ id: node.id, type: UiCommandType.ControlSetValue, value: "Ada" }],
    record(node.id),
    { correlationId: "journey", transactionId: "input" }
  );
  await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(2));

  expect(execute.mock.calls[0]?.[0][0]).toMatchObject({
    requestId: "id-1",
    type: UiCommandType.ControlValidationStart
  });
  expect(execute.mock.calls[1]?.[0][0]).toMatchObject({
    requestId: "id-1",
    type: UiCommandType.ControlValidationResolve
  });
});

it("does not validate input-trigger commands for a blur control", () => {
  const node = asyncNode("Ada", UiUpdateTrigger.Blur);
  const execute = vi.fn();
  const validation = new UiRuntimeValidation(validRegistry(), ids(), () => node, execute);

  validation.afterCommit(
    [{ id: node.id, type: UiCommandType.ControlSetValue, value: "Grace" }],
    record(node.id),
    { correlationId: "journey", transactionId: "input" }
  );

  expect(execute).not.toHaveBeenCalled();
});

function asyncNode(value: string, updateOn = UiUpdateTrigger.Input) {
  const node = controlNode("name", value);
  if (node.control === undefined) throw new Error("Fixture control is missing.");
  return {
    ...node,
    control: { ...node.control, asyncValidatorIds: ["available"], updateOn }
  };
}

function validRegistry(): UiAsyncValidatorRegistryPort {
  return { validate: vi.fn(async () => []) };
}

function ids(): () => string {
  let value = 0;
  return () => `id-${++value}`;
}

function record(id: string): UiTransactionRecord {
  return {
    causationId: "input",
    changedNodeIds: [id],
    changedPaths: [],
    correlationId: "journey",
    id: "input",
    previousRevision: 0,
    revision: 1,
    status: "committed" as UiTransactionRecord["status"],
    timestamp: "2026-01-01T00:00:00.000Z"
  };
}

function applyPending(node: ReturnType<typeof asyncNode>, command: UiCommand | undefined): void {
  if (command?.type !== UiCommandType.ControlValidationStart) return;
  Object.assign(node.control, {
    pending: true,
    status: UiControlStatus.Pending,
    validationRequestId: command.requestId
  });
}
