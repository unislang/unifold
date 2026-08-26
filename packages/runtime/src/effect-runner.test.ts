import { UiCommandType, UiEventType, type UiEvent } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { UnifoldRuntime } from "./runtime.js";
import { controlNode } from "./runtime.test-data.js";

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

function effectRuntime(execute: () => Promise<void>) {
  const runtime = new UnifoldRuntime({
    commandPort: { execute },
    documentId: "effects",
    initialNodes: [controlNode("field", "")]
  });
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));
  return { events, runtime };
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
