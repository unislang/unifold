import { expect, it, vi } from "vitest";

import {
  createAsyncKeyValueStoreAdapter,
  type UiAsyncKeyValueCompareAndSetRequest,
  type UiAsyncKeyValueStorePort
} from "./async-key-value-store-adapter.js";
import {
  asyncStoreAdapterConformance,
  snapshot as conformanceSnapshot
} from "./async-store-adapter-conformance.test-data.js";
import type { UiAsyncStoreAdapterCommitCommand } from "./async-store-types.js";

asyncStoreAdapterConformance("key/value CAS", () => {
  const port = new ConformanceKeyValuePort();
  const adapter = createAsyncKeyValueStoreAdapter(port, "2.1.0", {
    createRevision: () => "revision-2",
    key: "customer"
  });
  return { adapter, publish: (value) => port.publish(value) };
});

class ConformanceKeyValuePort implements UiAsyncKeyValueStorePort {
  readonly #idempotency = new Set<string>();
  #listener: ((value: string) => void) | undefined;
  #value = JSON.stringify({ schemaVersion: "1.0.0", ...conformanceSnapshot("revision-1", "Ada") });

  async compareAndSet(request: UiAsyncKeyValueCompareAndSetRequest) {
    if (this.#idempotency.has(request.idempotencyKey)) return { status: "committed" } as const;
    if (storedRevision(this.#value) !== request.expectedRevision)
      return { status: "conflict" } as const;
    this.#value = request.value;
    this.#idempotency.add(request.idempotencyKey);
    return { status: "committed" } as const;
  }

  async read(): Promise<string> {
    return this.#value;
  }

  subscribe(_key: string, listener: (value: string) => void): () => void {
    this.#listener = listener;
    return () => {
      this.#listener = undefined;
    };
  }

  publish(snapshot: ReturnType<typeof conformanceSnapshot>): void {
    this.#value = JSON.stringify({ schemaVersion: "1.0.0", ...snapshot });
    this.#listener?.(this.#value);
  }
}

function storedRevision(value: string): string | undefined {
  return (JSON.parse(value) as { revision?: string }).revision;
}

it("loads bounded envelopes and makes an exact atomic compare-and-set request", async () => {
  const fixture = keyValueFixture(JSON.stringify(envelope("revision-1", "Ada")));
  const adapter = createAdapter(fixture.port);
  await expect(adapter.load()).resolves.toEqual(snapshot("revision-1", "Ada"));
  await expect(adapter.commit(command())).resolves.toEqual({
    snapshot: snapshot("revision-2", "Grace"),
    status: "committed"
  });
  expect(fixture.requests).toHaveLength(1);
  expect(fixture.requests[0]).toMatchObject({
    expectedRevision: "revision-1",
    idempotencyKey: "commit-1",
    key: "customer"
  });
  expect(JSON.parse(fixture.requests[0]?.value ?? "")).toEqual(envelope("revision-2", "Grace"));
});

it("maps compare conflicts, failures, and cancellation to closed results", async () => {
  const fixture = keyValueFixture(JSON.stringify(envelope("revision-1", "Ada")));
  const adapter = createAdapter(fixture.port);
  fixture.setStatus("conflict");
  await expect(adapter.commit(command())).resolves.toEqual({ status: "conflict" });
  fixture.compare.mockRejectedValueOnce(new Error("private provider failure"));
  await expect(adapter.commit(command())).resolves.toEqual({ status: "unavailable" });
  const controller = new AbortController();
  controller.abort();
  await expect(adapter.commit({ ...command(), signal: controller.signal })).resolves.toEqual({
    status: "cancelled"
  });
});

it("honors cancellation that arrives while compare-and-set is pending", async () => {
  const controller = new AbortController();
  const fixture = keyValueFixture(JSON.stringify(envelope("revision-1", "Ada")));
  fixture.compare.mockImplementationOnce(async () => {
    controller.abort();
    return { status: "committed" };
  });
  const adapter = createAdapter(fixture.port);
  await expect(adapter.commit({ ...command(), signal: controller.signal })).resolves.toEqual({
    status: "cancelled"
  });
});

it("supports an empty store and a port without subscriptions", async () => {
  const port: UiAsyncKeyValueStorePort = {
    compareAndSet: async () => ({ status: "conflict" }),
    read: async () => null
  };
  const adapter = createAdapter(port);
  await expect(adapter.load()).resolves.toBeUndefined();
  expect(adapter.subscribe).toBeUndefined();
  const controller = new AbortController();
  await adapter.commit({ ...command(), signal: controller.signal });
  expect(adapter.subscribe).toBeUndefined();
});

it("bounds and validates load and subscription envelopes", async () => {
  const fixture = keyValueFixture("{}");
  const adapter = createAdapter(fixture.port);
  await expect(adapter.load()).rejects.toThrow(/schema version/iu);
  const listener = vi.fn();
  const unsubscribe = requireSubscription(adapter.subscribe?.(listener));
  fixture.publish(JSON.stringify(envelope("revision-3", "External")));
  fixture.publish("not-json");
  expect(listener).toHaveBeenCalledOnce();
  expect(listener).toHaveBeenCalledWith(snapshot("revision-3", "External"));
  unsubscribe();
  expect(() => createAdapter(fixture.port, 1)).not.toThrow();
  await expect(createAdapter(fixture.port, 1).load()).rejects.toThrow(/too large/u);
});

it("rejects invalid configuration and non-advancing revisions", async () => {
  const fixture = keyValueFixture(JSON.stringify(envelope("revision-1", "Ada")));
  expect(() =>
    createAsyncKeyValueStoreAdapter(fixture.port, "", {
      createRevision: () => "revision-2",
      key: "customer"
    })
  ).toThrow(/version/u);
  expect(() =>
    createAsyncKeyValueStoreAdapter(fixture.port, "2.1.0", {
      createRevision: () => "revision-2",
      key: ""
    })
  ).toThrow(/key/u);
  [0, 1.5, 10 * 1024 * 1024 + 1].forEach((maximumBytes) => {
    expect(() => createAdapter(fixture.port, maximumBytes)).toThrow(/byte limit/u);
  });
  const adapter = createAsyncKeyValueStoreAdapter(fixture.port, "2.1.0", {
    createRevision: (revision) => revision,
    key: "customer"
  });
  await expect(adapter.commit(command())).resolves.toEqual({ status: "unavailable" });
  await expect(adapter.commit({ ...command(), dataVersion: "1.0.0" })).resolves.toEqual({
    status: "unavailable"
  });
});

const invalidEnvelopes = [
  "null",
  "[]",
  JSON.stringify({ schemaVersion: "1.0.0", revision: "revision-1", value: {} }),
  JSON.stringify({ dataVersion: "2.1.0", revision: "revision-1", schemaVersion: "1.0.0" }),
  JSON.stringify({ dataVersion: "2.1.0", revision: "", schemaVersion: "1.0.0", value: {} })
];

it.each(invalidEnvelopes)("rejects an invalid external envelope %#", async (encoded) => {
  const fixture = keyValueFixture(encoded);
  await expect(createAdapter(fixture.port).load()).rejects.toThrow(/invalid|missing/iu);
});

function createAdapter(port: UiAsyncKeyValueStorePort, maximumBytes?: number) {
  return createAsyncKeyValueStoreAdapter(port, "2.1.0", {
    createRevision: () => "revision-2",
    key: "customer",
    ...(maximumBytes === undefined ? {} : { maximumBytes })
  });
}

function keyValueFixture(initial: string) {
  let listener: ((value: string) => void) | undefined;
  const requests: UiAsyncKeyValueCompareAndSetRequest[] = [];
  const state = { status: "committed" as "committed" | "conflict" };
  const fixture = {
    compare: vi.fn(async (request: UiAsyncKeyValueCompareAndSetRequest) => {
      requests.push(request);
      return { status: state.status };
    }),
    publish: (value: string) => listener?.(value),
    requests,
    setStatus: (value: "committed" | "conflict") => {
      state.status = value;
    }
  };
  return {
    ...fixture,
    port: {
      compareAndSet: fixture.compare,
      read: async () => initial,
      subscribe: (_key: string, next: (value: string) => void) => {
        listener = next;
        return () => {
          listener = undefined;
        };
      }
    }
  };
}

function command(): UiAsyncStoreAdapterCommitCommand {
  return {
    candidate: { name: "Grace" },
    dataVersion: "2.1.0",
    expectedRevision: "revision-1",
    idempotencyKey: "commit-1",
    path: "/name",
    value: "Grace"
  };
}

function snapshot(revision: string, name: string) {
  return { dataVersion: "2.1.0", revision, value: { name } };
}

function envelope(revision: string, name: string) {
  return { schemaVersion: "1.0.0", ...snapshot(revision, name) };
}

function requireSubscription(value: (() => void) | undefined): () => void {
  if (value === undefined) throw new Error("Expected subscription support.");
  return value;
}
