import { expect, it, vi } from "vitest";

import { MemoryDataInvalidationBus } from "./invalidation-bus.js";

it("publishes invalidations to active contexts and supports disposal", () => {
  const bus = new MemoryDataInvalidationBus();
  const listener = vi.fn();
  bus.subscribe(() => {
    throw new Error("broken context");
  });
  const unsubscribe = bus.subscribe(listener);
  const message = {
    occurredAt: "2026-08-25T12:00:00.000Z",
    sourceId: "tab-a",
    tags: ["customers"]
  };

  bus.publish(message);
  unsubscribe();
  bus.publish(message);
  expect(listener).toHaveBeenCalledOnce();
});
