import { describe, expect, it, vi } from "vitest";

import type {
  UiAsyncStoreAdapter,
  UiAsyncStoreAdapterCommitCommand,
  UiAsyncStoreSnapshot
} from "./async-store-types.js";

interface UiAsyncStoreConformanceFixture {
  readonly adapter: UiAsyncStoreAdapter;
  publish(snapshot: UiAsyncStoreSnapshot): void;
}

export function asyncStoreAdapterConformance(
  name: string,
  create: () => UiAsyncStoreConformanceFixture
): void {
  describe(`${name} async adapter conformance`, () => {
    registerConformanceCases(create);
  });
}

function registerConformanceCases(create: () => UiAsyncStoreConformanceFixture): void {
  it("loads, atomically commits, replays, and rejects a stale revision", async () => {
    const fixture = create();
    await expect(fixture.adapter.load()).resolves.toEqual(snapshot("revision-1", "Ada"));
    const committed = await fixture.adapter.commit(command());
    expect(committed).toEqual({
      snapshot: snapshot("revision-2", "Grace"),
      status: "committed"
    });
    await expect(fixture.adapter.commit(command())).resolves.toEqual(committed);
    await expect(fixture.adapter.commit(staleCommand())).resolves.toMatchObject({
      status: "conflict"
    });
    await expect(fixture.adapter.load()).resolves.toEqual(snapshot("revision-2", "Grace"));
  });

  it("delivers external snapshots and releases subscriptions", () => {
    const fixture = create();
    const listener = vi.fn();
    const unsubscribe = requireSubscription(fixture.adapter.subscribe?.(listener));
    fixture.publish(snapshot("revision-3", "External"));
    expect(listener).toHaveBeenCalledWith(snapshot("revision-3", "External"));
    unsubscribe();
    fixture.publish(snapshot("revision-4", "Ignored"));
    expect(listener).toHaveBeenCalledOnce();
  });
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

function staleCommand(): UiAsyncStoreAdapterCommitCommand {
  return { ...command(), idempotencyKey: "commit-stale" };
}

export function snapshot(revision: string, name: string): UiAsyncStoreSnapshot {
  return { dataVersion: "2.1.0", revision, value: { name } };
}

function requireSubscription(value: (() => void) | undefined): () => void {
  if (value === undefined) throw new Error("Expected subscription support.");
  return value;
}
