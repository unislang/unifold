import {
  UiDerivedRuleOutputKind,
  UiDerivedRuleSchemaVersion,
  type UiDerivedRuleDefinition
} from "@unislang/unifold-contracts";
import {
  UiCommandType,
  UiControlStatus,
  UiEventType,
  UiNodeKind,
  UiValidationSeverity,
  type UiEvent,
  type UiNodeSnapshot,
  type UiValidationError
} from "@unislang/unifold-events";
import type { UiAsyncValidatorRegistryPort } from "@unislang/unifold-forms";
import { createSelector } from "@unislang/unifold-reactivity";
import { describe, expect, it, vi } from "vitest";
import { UnifoldRuntime, UnifoldRuntimeStatus } from "./index.js";
import { compositionNode, controlNode } from "./runtime.test-data.js";

describe("UnifoldRuntime transactions", () => {
  it("commits multiple commands once and publishes post-commit facts", verifiesCommit);
  it("applies reachable derived rules in the same observable transaction", verifiesDerivedRules);
  it("omits store writes for bound nodes removed in the same batch", verifiesRemovedStoreWrite);
  it("suppresses store writes for externally projected transactions", verifiesSuppressedStoreWrite);
});

describe("UnifoldRuntime actor routing", () => {
  it("routes the canonical fact to a registered owning actor", verifiesRouting);
  it("drops actors owned by structurally replaced nodes", verifiesStructuralActorCleanup);
});

describe("UnifoldRuntime scope views", () => {
  it("observes identical facts with coherent aggregate snapshots", verifiesScopeView);
});

it("publishes one terminal event and rejects disposed operations", verifyRuntimeDisposal);
it("keeps empty execution read-only and preserves custom sources", verifyRuntimeDefaults);
it("exposes one immutable read-only inspection snapshot", verifyRuntimeInspection);
it("cancels superseded async validation and rejects stale completion", verifyAsyncValidation);

function verifiesCommit(): void {
  let id = 0;
  const runtime = new UnifoldRuntime({
    documentId: "test",
    initialNodes: [controlNode("field", "A")],
    createId: () => `id-${++id}`,
    now: () => "2026-08-24T00:00:00.000Z"
  });
  const facts: UiEvent[] = [];
  runtime.events$.subscribe((event) => facts.push(event));

  const record = runtime.execute([
    { type: UiCommandType.ControlSetValue, id: "field", value: "B" },
    { type: UiCommandType.ControlSetStatus, id: "field", status: UiControlStatus.Invalid }
  ]);

  expect(record.revision).toBe(1);
  expect(controlValue(runtime.getSnapshot("field"))).toBe("B");
  expect(facts.map((event) => event.type)).toEqual([
    UiEventType.CommandApplied,
    UiEventType.CommandApplied,
    UiEventType.TransactionCommitted
  ]);
  expect(facts.every((event) => event.staterevision === 1)).toBe(true);
}

function verifyRuntimeInspection(): void {
  const runtime = new UnifoldRuntime({
    documentId: "test",
    initialNodes: [controlNode("field", "A")]
  });
  const inspection = runtime.inspect();
  expect(inspection.revision).toBe(0);
  expect(inspection.nodes.map(({ id }) => id)).toEqual(["field"]);
  expect(inspection.selectionDispatch.activeSelections).toBe(0);
  expect(Object.isFrozen(inspection)).toBe(true);
  expect(Object.isFrozen(inspection.nodes)).toBe(true);
  expect(Object.isFrozen(inspection.selectionDispatch)).toBe(true);
}

function verifiesDerivedRules(): void {
  const runtime = new UnifoldRuntime({
    documentId: "test",
    initialNodes: [controlNode("age", "16"), controlNode("submit", "")],
    rules: [disabledRule()]
  });
  expect(runtime.getSnapshot("submit").base.disabled).toBe(true);
  expect(runtime.revision).toBe(0);
  const facts: UiEvent[] = [];
  runtime.events$.subscribe((event) => facts.push(event));
  const record = runtime.execute([{ id: "age", type: UiCommandType.ControlSetValue, value: "21" }]);
  expect(runtime.getSnapshot("submit").base.disabled).toBe(false);
  expect(record.changedNodeIds).toEqual(["age", "submit"]);
  expect(facts.map(({ type }) => type)).toEqual([
    UiEventType.CommandApplied,
    UiEventType.CommandApplied,
    UiEventType.TransactionCommitted
  ]);
}

function disabledRule(): UiDerivedRuleDefinition {
  return {
    expression: { "<": [{ var: "age" }, 18] },
    id: "disable-submit",
    inputs: [{ name: "age", nodeId: "age", pointer: "/control/value" }],
    output: { kind: UiDerivedRuleOutputKind.ControlSetDisabled, nodeId: "submit" },
    schemaVersion: UiDerivedRuleSchemaVersion.Version1,
    version: "1.0.0"
  };
}

function verifiesRemovedStoreWrite(): void {
  const execute = vi.fn();
  const runtime = new UnifoldRuntime({
    commandPort: { execute },
    documentId: "test",
    initialNodes: [controlNode("field", "A")],
    storeBindings: { field: { path: "/name", storeId: "customer" } }
  });

  const record = runtime.execute([
    { id: "field", type: UiCommandType.ControlSetValue, value: "B" },
    { id: "field", type: UiCommandType.StructureRemove }
  ]);

  expect(record.revision).toBe(1);
  expect(record.changedNodeIds).toContain("field");
  expect(execute).not.toHaveBeenCalled();
}

function verifiesSuppressedStoreWrite(): void {
  const execute = vi.fn();
  const runtime = new UnifoldRuntime({
    commandPort: { execute },
    documentId: "test",
    initialNodes: [controlNode("field", "A"), controlNode("other", "X")],
    storeBindings: {
      field: { path: "/name", storeId: "customer" },
      other: { path: "/value", storeId: "secondary" }
    }
  });

  runtime.execute(
    [
      { id: "field", type: UiCommandType.ControlSetValue, value: "B" },
      { id: "other", type: UiCommandType.ControlSetValue, value: "Y" }
    ],
    { suppressedStoreWriteIds: ["customer"] }
  );

  expect(controlValue(runtime.getSnapshot("field"))).toBe("B");
  expect(execute.mock.calls.map(([command]) => command)).toEqual([
    {
      id: "other",
      path: "/value",
      storeId: "secondary",
      type: UiCommandType.StoreWrite,
      value: "Y"
    }
  ]);
}

function verifiesRouting(): void {
  const runtime = new UnifoldRuntime({
    documentId: "test",
    initialNodes: [controlNode("field", "A")],
    createId: () => "id",
    now: () => "2026-08-24T00:00:00.000Z"
  });
  const actor = { send: vi.fn() };
  const unregister = runtime.registerActor("field", actor);

  runtime.execute([{ type: UiCommandType.ControlSetValue, id: "field", value: "B" }]);
  unregister();
  runtime.execute([{ type: UiCommandType.ControlSetValue, id: "field", value: "C" }]);

  expect(actor.send).toHaveBeenCalledTimes(2);
}

function verifiesStructuralActorCleanup(): void {
  const original = controlNode("field", "A");
  const runtime = new UnifoldRuntime({ documentId: "test", initialNodes: [original] });
  const actor = { send: vi.fn() };
  runtime.registerActor("field", actor);
  runtime.execute([
    { type: UiCommandType.StructureRemove, id: "field" },
    { type: UiCommandType.StructureInstantiate, node: { ...original, control: control("B") } }
  ]);
  runtime.execute([{ type: UiCommandType.ControlSetValue, id: "field", value: "C" }]);
  expect(actor.send).not.toHaveBeenCalled();
}

function control(value: string) {
  const snapshot = controlNode("fixture", value);
  if (snapshot.control === undefined) throw new Error("Expected a control snapshot.");
  return snapshot.control;
}

function verifyRuntimeDisposal(): void {
  const runtime = new UnifoldRuntime({
    documentId: "test",
    initialNodes: [controlNode("field", "A")]
  });
  const events: UiEvent[] = [];
  const complete = vi.fn();
  runtime.events$.subscribe({ next: (event) => events.push(event), complete });
  runtime.dispose();
  runtime.dispose();
  expect(runtime.status).toBe(UnifoldRuntimeStatus.Disposed);
  expect(events.map((event) => event.type)).toEqual([UiEventType.RuntimeDisposed]);
  expect(complete).toHaveBeenCalledTimes(1);
  expectDisposedOperations(runtime);
}

function verifyRuntimeDefaults(): void {
  let id = 0;
  const runtime = new UnifoldRuntime({
    documentId: "empty",
    createId: () => `generated-${++id}`,
    now: () => "2026-08-24T00:00:00.000Z",
    source: "urn:test:runtime",
    transactionRetention: 2
  });
  const facts: UiEvent[] = [];
  runtime.events$.subscribe((event) => facts.push(event));
  const record = runtime.execute([]);
  expect(record).toMatchObject({ changedNodeIds: [], previousRevision: 0, revision: 0 });
  expect(facts).toEqual([]);
  expect(runtime.select(createSelector((state) => state.revision)).get()).toBe(0);
  runtime.dispose();
  expect(facts[0]).toMatchObject({ source: "urn:test:runtime" });
}

function expectDisposedOperations(runtime: UnifoldRuntime): void {
  expect(() => runtime.node("field")).toThrow("disposed");
  expect(() => runtime.select(createSelector((state) => state.revision))).toThrow("disposed");
  expect(() => runtime.registerActor("field", { send: vi.fn() })).toThrow("disposed");
  expect(() => runtime.execute([])).toThrow("disposed");
}

function verifiesScopeView(): void {
  const field = { ...controlNode("field", "A", "form"), properties: { name: "field" } };
  const form = { ...compositionNode("form"), kind: UiNodeKind.Form };
  const runtime = new UnifoldRuntime({ documentId: "test", initialNodes: [form, field] });
  const rootEvents: UiEvent[] = [];
  const scopeEvents: UiEvent[] = [];
  const observedValues: unknown[] = [];
  runtime.events$.subscribe((event) => rootEvents.push(event));
  runtime.scope("form").events$.subscribe((event) => {
    scopeEvents.push(event);
    observedValues.push(runtime.getSnapshot("form").control?.value);
  });
  runtime.execute([{ type: UiCommandType.ControlSetValue, id: "field", value: "B" }]);
  expect(scopeEvents).toHaveLength(2);
  expect(scopeEvents.every((event, index) => event === rootEvents[index])).toBe(true);
  expect(observedValues).toEqual([{ field: "B" }, { field: "B" }]);
}

function controlValue(snapshot: UiNodeSnapshot): unknown {
  return snapshot.control?.value;
}

async function verifyAsyncValidation(): Promise<void> {
  const pending = new Map<string, (errors: readonly UiValidationError[]) => void>();
  const signals = new Map<string, AbortSignal>();
  const registry: UiAsyncValidatorRegistryPort = {
    validate: vi.fn((node, signal) => {
      const value = String(node.control?.value);
      signals.set(value, signal);
      return new Promise<readonly UiValidationError[]>((resolve) => pending.set(value, resolve));
    })
  };
  const runtime = asyncRuntime(registry);
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));

  runtime.execute([{ id: "field", type: UiCommandType.ControlSetValue, value: "taken" }]);
  runtime.execute([{ id: "field", type: UiCommandType.ControlSetValue, value: "available" }]);
  expect(requireSignal(signals, "taken").aborted).toBe(true);
  resolveValidation(pending, "available", []);
  await vi.waitFor(() => expect(requireControl(runtime).pending).toBe(false));
  resolveValidation(pending, "taken", [unavailableError()]);
  await Promise.resolve();

  expect(runtime.getSnapshot("field").control).toMatchObject({
    errors: [],
    status: UiControlStatus.Valid,
    validationRequestId: null,
    value: "available"
  });
  expect(events.filter(({ type }) => type === UiEventType.ValidationStarted)).toHaveLength(2);
  expect(events.filter(({ type }) => type === UiEventType.ValidationCancelled)).toHaveLength(1);
  expect(events.filter(({ type }) => type === UiEventType.ValidationCompleted)).toHaveLength(1);
}

function asyncRuntime(registry: UiAsyncValidatorRegistryPort): UnifoldRuntime {
  const node = controlNode("field", "initial");
  if (node.control === undefined) throw new Error("Expected a control.");
  const configured = {
    ...node,
    control: { ...node.control, asyncValidatorIds: ["available"] }
  };
  return new UnifoldRuntime({
    asyncValidatorRegistry: registry,
    documentId: "test",
    initialNodes: [configured]
  });
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

function requireControl(runtime: UnifoldRuntime) {
  const control = runtime.getSnapshot("field").control;
  if (control === undefined) throw new Error("Runtime control is missing.");
  return control;
}
