import {
  UiCommandType,
  UiEventDataSchema,
  UiEventType,
  type UiEvent
} from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { UnifoldRuntime } from "./runtime.js";
import { controlNode } from "./runtime.test-data.js";
import type { UiCommandPort, UiEffectExecutionContext } from "./types.js";

it("publishes completion only after an asynchronous effect settles", async () => {
  const pending = deferred();
  const { events, runtime } = effectRuntime(() => pending.promise);

  runtime.execute([{ id: "field", type: UiCommandType.FocusRequest }]);
  expect(effectTypes(events)).toEqual([UiEventType.EffectRequested]);

  pending.resolve();
  await vi.waitFor(() => expect(effectTypes(events)).toContain(UiEventType.EffectCompleted));
});

it("contains asynchronous effect rejection without disclosing its cause", async () => {
  const { events, runtime } = effectRuntime(() => Promise.reject(new Error("provider-secret")));

  runtime.execute([{ id: "field", type: UiCommandType.FocusRequest }]);
  await vi.waitFor(() => expect(effectTypes(events)).toContain(UiEventType.EffectFailed));

  expect(JSON.stringify(events)).not.toContain("provider-secret");
});

it("does not publish a late effect settlement after disposal", async () => {
  const pending = deferred();
  const { events, runtime } = effectRuntime(() => pending.promise);
  runtime.execute([{ id: "field", type: UiCommandType.FocusRequest }]);

  runtime.dispose();
  pending.resolve();
  await Promise.resolve();

  expect(effectTypes(events)).toEqual([UiEventType.EffectRequested]);
});

it("correlates identical asynchronous effects that settle out of order", async () => {
  const first = deferred();
  const second = deferred();
  const contexts: UiEffectExecutionContext[] = [];
  const pending = [first.promise, second.promise];
  const { events, runtime } = effectRuntime((_command, context) => {
    contexts.push(context);
    return pending[contexts.length - 1];
  });
  const command = { id: "field", type: UiCommandType.FocusRequest } as const;

  runtime.execute([command, command]);

  const requested = effectEvents(events, UiEventType.EffectRequested);
  const applied = events.filter(({ type }) => type === UiEventType.CommandApplied);
  expect(requested.map(({ subject }) => subject)).toEqual(applied.map(({ subject }) => subject));
  expect(new Set(requested.map(({ subject }) => subject)).size).toBe(2);
  expect(contexts.map(({ effectId }) => effectId)).toEqual(requested.map(({ subject }) => subject));
  expect(requested.every(({ dataschema }) => dataschema === UiEventDataSchema.EffectV1)).toBe(true);

  second.resolve();
  await vi.waitFor(() => expect(effectEvents(events, UiEventType.EffectCompleted)).toHaveLength(1));
  first.resolve();
  await vi.waitFor(() => expect(effectEvents(events, UiEventType.EffectCompleted)).toHaveLength(2));

  const completed = effectEvents(events, UiEventType.EffectCompleted);
  expect(completed.map(({ subject }) => subject)).toEqual([
    requested[1]?.subject,
    requested[0]?.subject
  ]);
  expect(completed.every(({ id, subject }) => id !== subject)).toBe(true);
});

function effectRuntime(execute: UiCommandPort["execute"]) {
  const runtime = new UnifoldRuntime({
    commandPort: { execute },
    documentId: "effects",
    initialNodes: [controlNode("field", "")]
  });
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));
  return { events, runtime };
}

function effectEvents(events: readonly UiEvent[], type: UiEventType): readonly UiEvent[] {
  return events.filter((event) => event.type === type);
}

function effectTypes(events: readonly UiEvent[]): string[] {
  return events.filter((event) => event.data.phase === "effect").map(({ type }) => type);
}

function deferred(): { readonly promise: Promise<void>; readonly resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}
