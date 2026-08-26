import { expect, it, vi } from "vitest";

import { createAsyncMemoryStoreAdapter } from "./async-memory-store-adapter.js";
import { asyncStoreAdapterConformance } from "./async-store-adapter-conformance.test-data.js";
import type {
  UiAsyncStoreAdapterCommitCommand,
  UiAsyncStoreSnapshot
} from "./async-store-types.js";

asyncStoreAdapterConformance("memory", () => {
  const adapter = createAsyncMemoryStoreAdapter("2.1.0", {
    createRevision: () => "revision-2",
    initialSnapshot: snapshot("revision-1", "Ada")
  });
  return { adapter, publish: (value) => adapter.publish(value) };
});

it("loads defensively and commits a canonical candidate with optimistic concurrency", async () => {
  const adapter = createAsyncMemoryStoreAdapter("2.1.0", {
    createRevision: () => "revision-2",
    initialSnapshot: snapshot("revision-1", "Ada")
  });
  const loaded = await adapter.load();
  mutateName(loaded, "mutated");
  expect(await adapter.load()).toEqual(snapshot("revision-1", "Ada"));
  await expect(adapter.commit(command())).resolves.toEqual({
    snapshot: snapshot("revision-2", "Grace"),
    status: "committed"
  });
  expect(adapter.snapshot()).toEqual(snapshot("revision-2", "Grace"));
  await expect(adapter.commit({ ...command(), idempotencyKey: "other" })).resolves.toEqual({
    status: "conflict"
  });
});

it("replays accepted idempotency keys and bounds retained results", async () => {
  let revision = 1;
  const adapter = createAsyncMemoryStoreAdapter("2.1.0", {
    createRevision: () => `revision-${(revision += 1)}`,
    idempotencyLimit: 1,
    initialSnapshot: snapshot("revision-1", "Ada")
  });
  const first = await adapter.commit(command());
  await expect(adapter.commit(command())).resolves.toEqual(first);
  await adapter.commit({ ...command("revision-2"), idempotencyKey: "commit-2" });
  await expect(adapter.commit(command())).resolves.toMatchObject({ status: "conflict" });
});

it("supports isolated external subscriptions and cancellation", async () => {
  const adapter = createAsyncMemoryStoreAdapter("2.1.0", {
    initialSnapshot: snapshot("revision-1", "Ada")
  });
  const first = vi.fn(() => {
    throw new Error("consumer failure");
  });
  const second = vi.fn();
  const unsubscribeFirst = subscribe(adapter, first);
  subscribe(adapter, second);
  adapter.publish(snapshot("revision-2", "External"));
  expect(first).toHaveBeenCalledOnce();
  expect(second).toHaveBeenCalledWith(snapshot("revision-2", "External"));
  unsubscribeFirst();
  const controller = new AbortController();
  controller.abort();
  await expect(
    adapter.commit({ ...command("revision-2"), signal: controller.signal })
  ).resolves.toEqual({
    status: "cancelled"
  });
});

it("rejects unsafe revision factories and invalid configuration", async () => {
  expect(() => createAsyncMemoryStoreAdapter("", {})).toThrow(/version/u);
  expect(() => createAsyncMemoryStoreAdapter("2.1.0", { idempotencyLimit: 0 })).toThrow(/limit/u);
  const adapter = createAsyncMemoryStoreAdapter("2.1.0", {
    createRevision: (previous) => previous,
    initialSnapshot: snapshot("revision-1", "Ada")
  });
  await expect(adapter.commit(command())).resolves.toEqual({ status: "invalid" });
});

it("generates bounded default revisions and supports an initially absent value", async () => {
  const adapter = createAsyncMemoryStoreAdapter("2.1.0");
  await expect(adapter.load()).resolves.toBeUndefined();
  await expect(
    adapter.commit({ ...command("missing"), candidate: { name: "Ada" }, value: "Ada" })
  ).resolves.toMatchObject({ status: "conflict" });
  const initialized = createAsyncMemoryStoreAdapter("2.1.0", {
    initialSnapshot: snapshot("revision-1", "Ada")
  });
  await expect(initialized.commit(command())).resolves.toMatchObject({
    snapshot: { revision: "memory-1" },
    status: "committed"
  });
});

function command(expectedRevision = "revision-1"): UiAsyncStoreAdapterCommitCommand {
  return {
    candidate: { name: "Grace" },
    dataVersion: "2.1.0",
    expectedRevision,
    idempotencyKey: "commit-1",
    path: "/name",
    value: "Grace"
  };
}

function snapshot(revision: string, name: string) {
  return { dataVersion: "2.1.0", revision, value: { name } };
}

function mutateName(value: unknown, name: string): void {
  const snapshotValue = value as { value: { name: string } } | undefined;
  if (snapshotValue !== undefined) snapshotValue.value.name = name;
}

function subscribe(
  adapter: ReturnType<typeof createAsyncMemoryStoreAdapter>,
  listener: (value: UiAsyncStoreSnapshot) => void
): () => void {
  const unsubscribe = adapter.subscribe?.(listener);
  if (unsubscribe === undefined) throw new Error("Expected subscription support.");
  return unsubscribe;
}
