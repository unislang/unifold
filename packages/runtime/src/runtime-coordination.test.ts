import {
  UiCommandType,
  UiEventType,
  UiTransactionStatus,
  type UiEvent
} from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import {
  RuntimeCoordination,
  RuntimeCoordinationManager,
  type DeferredRuntimeWork
} from "./runtime-coordination.js";
import { UnifoldRuntime } from "./runtime.js";
import { controlNode } from "./runtime.test-data.js";

it("discards staged runtime state, transactions, selections, events, and sequence use", () => {
  const runtime = runtimeFixture();
  const events: UiEvent[] = [];
  const values: unknown[] = [];
  runtime.control<string>("field").value$.subscribe((value) => values.push(value));
  runtime.events$.subscribe((candidate) => events.push(candidate));
  const coordination = runtime.beginCoordination();
  coordination.execute(setValue("candidate"));
  expect(runtime.revision).toBe(1);
  expect(values).toEqual(["initial"]);
  expect(runtime.getTransaction(1)).toBeUndefined();
  expect(events).toEqual([]);
  expect(() => runtime.execute(setValue("blocked"))).toThrow("runtime is coordinated");
  coordination.discard();
  expect(runtime.revision).toBe(0);
  expect(runtime.getSnapshot("field").control?.value).toBe("initial");
  runtime.execute(setValue("committed"));
  expect(events.map(({ sequence }) => sequence)).toEqual([1, 2]);
  runtime.dispose();
});

it("publishes one coherent staged runtime commit", () => {
  const runtime = runtimeFixture();
  const events: UiEvent[] = [];
  const values: unknown[] = [];
  runtime.control<string>("field").value$.subscribe((value) => values.push(value));
  runtime.events$.subscribe((candidate) => events.push(candidate));
  const coordination = runtime.beginCoordination();
  const record = coordination.execute(setValue("committed"));
  coordination.commit();
  expect(values).toEqual(["initial", "committed"]);
  expect(runtime.getTransaction(record.revision)).toBe(record);
  expect(events.map(({ sequence }) => sequence)).toEqual([1, 2]);
  runtime.dispose();
});

it("settles staged authorities before publishing committed work", () => {
  const trace: string[] = [];
  const coordination = coordinatedFixture(trace);
  coordination.registerActor("form", { send: vi.fn() });
  coordination.defer(deferredWork());
  coordination.commit();
  expect(trace).toEqual([
    "publish:prepare",
    "remove",
    "actor:form",
    "store:commit",
    "actors:commit",
    "finish",
    "publish:commit",
    "effects",
    "validate"
  ]);
});

it("cleans every staged actor when a later installation fails", () => {
  const trace: string[] = [];
  const firstUnregister = vi.fn();
  const coordination = coordinatedFixture(trace, (id) => {
    if (id === "second") throw new Error("installation failed");
    return firstUnregister;
  });
  coordination.registerActor("first", { send: vi.fn() });
  coordination.registerActor("second", { send: vi.fn() });

  expect(() => coordination.commit()).toThrow("installation failed");
  expect(firstUnregister).toHaveBeenCalledOnce();
  expect(trace).not.toContain("store:commit");
  coordination.discard();
});

it("keeps coordination discardable when the store commit fails", () => {
  const trace: string[] = [];
  const coordination = fixtureWithStoreFailure(trace);
  coordination.registerActor("field", { send: vi.fn() });

  expect(() => coordination.commit()).toThrow("store commit failed");
  coordination.discard();
  expect(trace).toContain("actors:discard");
  expect(trace).toContain("store:discard");
  expect(trace).toContain("publish:discard");
});

it("contains deferred adapter failures after the commit point", () => {
  const trace: string[] = [];
  const coordination = fixtureWithDeferredFailure(trace);
  coordination.defer(deferredWork());
  expect(() => coordination.commit()).not.toThrow();
  expect(trace).toContain("effects");
  expect(trace).toContain("validate");
});

it("discards publication when the normalized savepoint cannot open", () => {
  const discard = vi.fn();
  const manager = new RuntimeCoordinationManager({
    captureActors: () => ({ commit: vi.fn(), discard: vi.fn() }),
    captureAuthorities: () => ({ compositionInstances: {}, rules: undefined, storeBindings: {} }),
    execute: vi.fn(),
    installActor: vi.fn(),
    publisher: { beginCoordination: () => ({ commit: vi.fn(), discard }) } as never,
    remove: vi.fn(),
    restoreAuthorities: vi.fn(),
    runEffects: vi.fn(),
    store: {
      beginCoordination: () => {
        throw new Error("savepoint failed");
      }
    } as never,
    validate: vi.fn()
  });

  expect(() => manager.begin()).toThrow("savepoint failed");
  expect(discard).toHaveBeenCalledOnce();
});

it("removes recycled owners before installing staged actors", () => {
  const original = controlNode("field", "A");
  const runtime = new UnifoldRuntime({ documentId: "test", initialNodes: [original] });
  const oldActor = { send: vi.fn() };
  const newActor = { send: vi.fn() };
  runtime.registerActor("field", oldActor);
  const coordination = runtime.beginCoordination();
  coordination.registerActor("field", newActor);
  coordination.execute([
    { id: "field", type: UiCommandType.StructureRemove },
    { node: original, type: UiCommandType.StructureInstantiate }
  ]);
  coordination.commit();
  runtime.execute([{ id: "field", type: UiCommandType.ControlSetValue, value: "B" }]);
  expect(oldActor.send).not.toHaveBeenCalled();
  expect(newActor.send).toHaveBeenCalled();
});

it("discards tentative state, staged actors, effects, and allocated sequences", () => {
  let id = 0;
  const execute = vi.fn();
  const events: UiEvent[] = [];
  const actor = { send: vi.fn() };
  const runtime = new UnifoldRuntime({
    commandPort: { execute },
    createId: () => `id-${++id}`,
    documentId: "test",
    initialNodes: [controlNode("field", "A")],
    storeBindings: { field: { path: "/name", storeId: "customer" } }
  });
  runtime.events$.subscribe((candidate) => events.push(candidate));
  const coordination = runtime.beginCoordination();
  coordination.registerActor("field", actor);
  coordination.execute([{ id: "field", type: UiCommandType.ControlSetValue, value: "B" }]);
  expect(runtime.getSnapshot("field").control?.value).toBe("B");
  expect(events).toEqual([]);
  expect(execute).not.toHaveBeenCalled();
  expect(() => runtime.execute([])).toThrow("coordinated");
  coordination.discard();
  expect(runtime.getSnapshot("field").control?.value).toBe("A");
  expect(runtime.revision).toBe(0);
  runtime.execute([{ id: "field", type: UiCommandType.ControlSetValue, value: "C" }]);
  expect(events.map(({ sequence }) => sequence)).toEqual([1, 2, 3, 4, 5]);
  expect(actor.send).not.toHaveBeenCalled();
  expect(execute).toHaveBeenCalledOnce();
  expect(() => coordination.execute([])).toThrow("closed");
});

it("publishes actor-reentrant runtime work after lower-sequence buffered facts", () => {
  const runtime = new UnifoldRuntime({
    documentId: "test",
    initialNodes: [controlNode("field", "A")]
  });
  const events: UiEvent[] = [];
  let reentered = false;
  runtime.events$.subscribe((candidate) => events.push(candidate));
  const coordination = runtime.beginCoordination();
  coordination.registerActor("field", {
    send: () => {
      if (reentered) return;
      reentered = true;
      runtime.execute([{ id: "field", type: UiCommandType.ControlSetValue, value: "C" }]);
    }
  });
  coordination.execute([{ id: "field", type: UiCommandType.ControlSetValue, value: "B" }]);
  coordination.commit();
  expect(events.map(({ sequence }) => sequence)).toEqual([1, 2, 3, 4]);
  expect(events.map(({ type }) => type)).toEqual([
    UiEventType.CommandApplied,
    UiEventType.TransactionCommitted,
    UiEventType.CommandApplied,
    UiEventType.TransactionCommitted
  ]);
});

function coordinatedFixture(
  trace: string[],
  installActor: (id: string) => () => void = defaultActorInstaller(trace)
): RuntimeCoordination {
  return createCoordinatedFixture(trace, installActor, () => trace.push("store:commit"), false);
}

function fixtureWithStoreFailure(trace: string[]): RuntimeCoordination {
  return createCoordinatedFixture(
    trace,
    defaultActorInstaller(trace),
    () => {
      throw new Error("store commit failed");
    },
    false
  );
}

function fixtureWithDeferredFailure(trace: string[]): RuntimeCoordination {
  return createCoordinatedFixture(
    trace,
    defaultActorInstaller(trace),
    () => trace.push("store:commit"),
    true
  );
}

function createCoordinatedFixture(
  trace: string[],
  installActor: (id: string) => () => void,
  commitStore: () => void,
  failDeferred: boolean
): RuntimeCoordination {
  return new RuntimeCoordination({
    actors: boundary(trace, "actors"),
    discardAuthorities: () => trace.push("authorities:discard"),
    execute: () => deferredWork().record,
    finish: () => trace.push("finish"),
    installActor,
    publish: publicationBoundary(trace),
    remove: () => trace.push("remove"),
    runEffects: () => deferredStep(trace, "effects", failDeferred),
    store: {
      commit: commitStore,
      discard: () => trace.push("store:discard")
    },
    validate: () => deferredStep(trace, "validate", failDeferred)
  });
}

function defaultActorInstaller(trace: string[]): (id: string) => () => void {
  return (id) => {
    trace.push(`actor:${id}`);
    return vi.fn();
  };
}

function publicationBoundary(trace: string[]) {
  return {
    ...boundary(trace, "publish"),
    prepare: () => trace.push("publish:prepare")
  };
}

function deferredStep(trace: string[], name: string, fail: boolean): void {
  trace.push(name);
  if (fail) throw new Error(`${name} failed`);
}

function boundary(trace: string[], name: string) {
  return {
    commit: () => trace.push(`${name}:commit`),
    discard: () => trace.push(`${name}:discard`)
  };
}

function deferredWork(): DeferredRuntimeWork {
  return {
    commands: [{ id: "field", type: UiCommandType.FormReset }],
    context: executionContext(),
    effects: [],
    record: {
      changedNodeIds: ["field"],
      changedPaths: ["/nodes/field"],
      correlationId: "correlation",
      id: "transaction",
      previousRevision: 0,
      revision: 1,
      status: UiTransactionStatus.Committed,
      timestamp: "2026-08-27T00:00:00.000Z"
    },
    removedIds: []
  };
}

function executionContext() {
  return {
    causationId: "cause",
    correlationId: "correlation",
    suppressedStoreWriteIds: [],
    transactionId: "transaction"
  };
}

function runtimeFixture(): UnifoldRuntime {
  return new UnifoldRuntime({
    documentId: "test",
    initialNodes: [controlNode("field", "initial")]
  });
}

function setValue(value: string) {
  return [{ id: "field", type: UiCommandType.ControlSetValue, value }] as const;
}
