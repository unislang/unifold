import { expect, it, vi } from "vitest";

import { connectAsyncStore } from "./async-store-connection.js";
import type { UiAsyncStoreAdapter } from "./async-store-types.js";
import { storeDefinition } from "./store-adapters-base.test-data.js";

it("cancels before authorization or provider loading", async () => {
  const controller = new AbortController();
  controller.abort();
  const adapter = adapterWithoutSubscription();
  const decide = vi.fn(async () => true);
  await expect(
    connectAsyncStore(storeDefinition(), adapter, {
      authorization: { decide },
      signal: controller.signal
    })
  ).resolves.toEqual({ code: "store-cancelled", status: "cancelled" });
  expect(decide).not.toHaveBeenCalled();
  expect(adapter.load).not.toHaveBeenCalled();
});

it("authorizes only operations exposed by the adapter", async () => {
  const adapter = adapterWithoutSubscription();
  const decide = vi.fn(async () => true);
  const result = await connectAsyncStore(storeDefinition(), adapter, {
    authorization: { decide }
  });
  expect(result.status).toBe("connected");
  expect(decide).toHaveBeenCalledOnce();
  expect(decide).toHaveBeenCalledWith({
    classification: storeDefinition().classification,
    operation: "load",
    storeId: "customer"
  });
  result.session?.dispose();
});

it("denies a subscription before loading and contains provider failures", async () => {
  const adapter = { ...adapterWithoutSubscription(), subscribe: vi.fn(() => () => undefined) };
  const denied = await connectAsyncStore(storeDefinition(), adapter, {
    authorization: {
      decide: async (request) => request.operation !== "subscribe"
    }
  });
  expect(denied).toEqual({ code: "store-connection-denied", status: "denied" });
  expect(adapter.load).not.toHaveBeenCalled();
  const unavailable = adapterWithoutSubscription();
  vi.mocked(unavailable.load).mockRejectedValueOnce(new Error("private load failure"));
  await expect(
    connectAsyncStore(storeDefinition(), unavailable, { authorization: allowAll() })
  ).resolves.toEqual({ code: "store-load-unavailable", status: "unavailable" });
});

it("rejects invalid loaded data and cancellation during authorization", async () => {
  const invalid = adapterWithoutSubscription();
  vi.mocked(invalid.load).mockResolvedValueOnce({
    dataVersion: "2.1.0",
    revision: "revision-1",
    value: { name: 42 }
  });
  await expect(
    connectAsyncStore(storeDefinition(), invalid, { authorization: allowAll() })
  ).resolves.toEqual({ code: "store-input-invalid", status: "invalid" });
  const controller = new AbortController();
  const cancelled = await connectAsyncStore(storeDefinition(), adapterWithoutSubscription(), {
    authorization: {
      decide: async () => {
        controller.abort();
        return true;
      }
    },
    signal: controller.signal
  });
  expect(cancelled).toEqual({ code: "store-cancelled", status: "cancelled" });
});

function adapterWithoutSubscription(): UiAsyncStoreAdapter {
  return {
    commit: vi.fn(),
    load: vi.fn(async () => ({
      dataVersion: "2.1.0",
      revision: "revision-1",
      value: { name: "Ada" }
    })),
    version: "2.1.0"
  };
}

function allowAll() {
  return { decide: async () => true };
}
