import { UiCommandType } from "@unislang/unifold-events";
import { createActor, toPromise } from "xstate";
import { describe, expect, it, vi } from "vitest";
import { createEffectActorLogic, UiEffectRegistry } from "./index.js";
import { effectInput } from "./effect-actor.test-data.js";

describe("UiEffectRegistry", () => {
  it("invokes only a registered named capability", async () => {
    const handler = vi.fn(async () => ({ saved: true }));
    const registry = new UiEffectRegistry();
    registry.register("customer.save", handler);
    const controller = new AbortController();

    const result = await registry.invoke(
      {
        command: {
          type: UiCommandType.EffectInvoke,
          capability: "customer.save",
          input: { id: "customer-1" }
        },
        context: {
          correlationId: "correlation-1",
          requestId: "request-1",
          transactionId: "transaction-1"
        }
      },
      controller.signal
    );

    expect(result).toEqual({ saved: true });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ signal: controller.signal }));
  });
});

it("rejects duplicate and unknown capabilities and supports disposal", () => {
  const registry = new UiEffectRegistry();
  const unregister = registry.register("customer.save", async () => null);
  expect(() => registry.register("customer.save", async () => null)).toThrow("already registered");
  unregister();
  expect(() => registry.invoke(effectInput("customer.save"), new AbortController().signal)).toThrow(
    "Unknown effect capability"
  );
});

it("runs registered handlers through XState promise logic", async () => {
  const registry = new UiEffectRegistry();
  registry.register("customer.save", async ({ input }) => ({ received: input }));
  const actor = createActor(createEffectActorLogic(registry), {
    input: effectInput("customer.save")
  });
  actor.start();
  await expect(toPromise(actor)).resolves.toEqual({ received: { id: "customer-1" } });
});
