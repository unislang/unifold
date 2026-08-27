import {
  UiCommandType,
  UiControlStatus,
  UiNodeKind,
  UiValidationSeverity,
  type UiValidationError
} from "@unislang/unifold-events";
import type { UiAsyncValidatorRegistryPort } from "@unislang/unifold-forms";
import { expect, it, vi } from "vitest";

import { UnifoldRuntime } from "./index.js";
import { compositionNode, controlNode } from "./runtime.test-data.js";

it("cascades aggregate disablement through logical control ancestry", () => {
  const runtime = aggregateRuntime();

  runtime.execute([{ disabled: true, id: "group", type: UiCommandType.ControlSetDisabled }]);
  expect(runtime.getSnapshot("group")).toMatchObject({
    base: { disabled: true, ownDisabled: true },
    properties: { disabled: true }
  });
  expect(runtime.getSnapshot("field")).toMatchObject({
    base: { disabled: true, interactive: false, ownDisabled: false },
    control: { status: UiControlStatus.Disabled }
  });
  expect(runtime.getSnapshot("visual-wrapper").base.disabled).toBe(false);
  expect(runtime.getSnapshot("form").control).toMatchObject({
    rawValue: { profile: { name: "Ada" } },
    value: {}
  });

  runtime.execute([{ disabled: true, id: "field", type: UiCommandType.ControlSetDisabled }]);
  runtime.execute([{ disabled: false, id: "group", type: UiCommandType.ControlSetDisabled }]);
  expect(runtime.getSnapshot("field").base).toMatchObject({ disabled: true, ownDisabled: true });
  runtime.execute([{ disabled: false, id: "field", type: UiCommandType.ControlSetDisabled }]);
  expect(runtime.getSnapshot("form").control?.value).toEqual({ profile: { name: "Ada" } });
});

function aggregateRuntime(): UnifoldRuntime {
  const form = {
    ...compositionNode("form"),
    controlChildIds: ["group"],
    kind: UiNodeKind.Form
  };
  const group = {
    ...compositionNode("group"),
    controlChildIds: ["field"],
    controlKey: "profile",
    controlParentId: "form",
    kind: UiNodeKind.Group
  };
  const field = {
    ...controlNode("field", "Ada", "visual-wrapper"),
    controlChildIds: [],
    controlKey: "name",
    controlParentId: "group",
    properties: { name: "native-name" }
  };
  const runtime = new UnifoldRuntime({
    documentId: "test",
    initialNodes: [form, compositionNode("visual-wrapper"), group, field]
  });
  return runtime;
}

it("cancels descendant async validation when a logical aggregate is disabled", async () => {
  const { pending, runtime, signals } = asyncDisabledFixture();

  runtime.execute([{ id: "field", type: UiCommandType.ControlSetValue, value: "taken" }]);
  runtime.execute([{ disabled: true, id: "group", type: UiCommandType.ControlSetDisabled }]);
  expect(requireSignal(signals, "taken").aborted).toBe(true);
  expect(runtime.getSnapshot("field").control).toMatchObject({
    errors: [],
    pending: false,
    status: UiControlStatus.Disabled,
    validationRequestId: null
  });

  resolveValidation(pending, "taken", [unavailableError()]);
  await Promise.resolve();
  expect(runtime.getSnapshot("field").control).toMatchObject({
    errors: [],
    status: UiControlStatus.Disabled,
    validationRequestId: null
  });
  runtime.execute([{ disabled: false, id: "group", type: UiCommandType.ControlSetDisabled }]);
  expect(runtime.getSnapshot("field").control?.status).toBe(UiControlStatus.Pending);
});

function asyncDisabledFixture() {
  const pending = new Map<string, (errors: readonly UiValidationError[]) => void>();
  const signals = new Map<string, AbortSignal>();
  const registry = asyncValidatorRegistry(pending, signals);
  const form = { ...compositionNode("form"), controlChildIds: ["group"], kind: UiNodeKind.Form };
  const group = {
    ...compositionNode("group"),
    controlChildIds: ["field"],
    controlKey: "profile",
    controlParentId: "form",
    kind: UiNodeKind.Group
  };
  const baseField = controlNode("field", "initial", "group");
  if (baseField.control === undefined) throw new Error("Expected a control.");
  const field = {
    ...baseField,
    controlKey: "name",
    controlParentId: "group",
    control: { ...baseField.control, asyncValidatorIds: ["available"] }
  };
  const runtime = new UnifoldRuntime({
    asyncValidatorRegistry: registry,
    documentId: "test",
    initialNodes: [form, group, field]
  });
  return { pending, runtime, signals };
}

function asyncValidatorRegistry(
  pending: Map<string, (errors: readonly UiValidationError[]) => void>,
  signals: Map<string, AbortSignal>
): UiAsyncValidatorRegistryPort {
  return {
    validate: vi.fn((node, signal) => {
      const value = String(node.control?.value);
      signals.set(value, signal);
      return new Promise<readonly UiValidationError[]>((resolve) => pending.set(value, resolve));
    })
  };
}

function unavailableError(): UiValidationError {
  return {
    code: "unavailable",
    messageKey: "validation.unavailable",
    severity: UiValidationSeverity.Error,
    validatorId: "available"
  };
}

function requireSignal(signals: ReadonlyMap<string, AbortSignal>, value: string): AbortSignal {
  const signal = signals.get(value);
  if (signal === undefined) throw new Error(`Missing validation signal: ${value}.`);
  return signal;
}

function resolveValidation(
  pending: ReadonlyMap<string, (errors: readonly UiValidationError[]) => void>,
  value: string,
  errors: readonly UiValidationError[]
): void {
  const resolve = pending.get(value);
  if (resolve === undefined) throw new Error(`Missing pending validation: ${value}.`);
  resolve(errors);
}
