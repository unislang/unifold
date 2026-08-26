import { DataClassification } from "@unislang/unifold-contracts";
import { expect, it, vi } from "vitest";

import type {
  UiAsyncStoreAdapter,
  UiAsyncStoreCommitResult,
  UiAsyncStoreSnapshot,
  UiStoreSinkAuthorizationPort
} from "./async-store-types.js";
import { connectAsyncStore } from "./async-store-connection.js";
import { storeDefinition } from "./store-adapters-base.test-data.js";

it("loads, authorizes, migrates, validates, and defensively exposes an async snapshot", async () => {
  const fixture = adapterFixture({
    dataVersion: "1.0.0",
    revision: "revision-1",
    value: { fullName: "Ada" }
  });
  const decide = vi.fn(async () => true);
  const result = await connectAsyncStore(storeDefinition(), fixture.adapter, {
    authorization: { decide },
    migrations: [
      {
        fromVersion: "1.0.0",
        migrate: (value) => ({ name: (value as { fullName: string }).fullName }),
        toVersion: "2.1.0"
      }
    ]
  });
  expect(result.status).toBe("connected");
  expect(result.session?.snapshot).toEqual({
    dataVersion: "2.1.0",
    revision: "revision-1",
    value: { name: "Ada" }
  });
  expectLoadAuthorized(decide);
  result.session?.dispose();
  expect(fixture.unsubscribe).toHaveBeenCalledOnce();
});

it("authorizes and validates an optimistic commit before accepting its new revision", async () => {
  const fixture = adapterFixture(snapshot("revision-1", "Ada"));
  fixture.commit.mockResolvedValueOnce({
    snapshot: snapshot("revision-2", "Grace"),
    status: "committed"
  });
  const decide = vi.fn(async () => true);
  const session = await connectedSession(fixture.adapter, { decide });
  const result = await session.commit(commitCommand());
  expect(result).toEqual({ snapshot: snapshot("revision-2", "Grace"), status: "committed" });
  expect(fixture.commit).toHaveBeenCalledWith({
    ...commitCommand(),
    candidate: { name: "Grace" },
    dataVersion: "2.1.0"
  });
  expect(decide).toHaveBeenLastCalledWith({
    classification: DataClassification.Internal,
    operation: "commit",
    path: "/name",
    storeId: "customer"
  });
});

it("returns safe denial, local conflict, invalid candidate, and provider failure results", async () => {
  const fixture = adapterFixture(snapshot("revision-1", "Ada"));
  const denied = await connectedSession(fixture.adapter, operationAuthorization("commit", false));
  await expect(denied.commit(commitCommand())).resolves.toMatchObject({ status: "denied" });
  const allowed = await connectedSession(fixture.adapter, operationAuthorization("commit", true));
  await expect(
    allowed.commit({ ...commitCommand(), expectedRevision: "stale" })
  ).resolves.toMatchObject({ status: "conflict" });
  await expect(allowed.commit({ ...commitCommand(), value: 42 })).resolves.toMatchObject({
    status: "invalid"
  });
  fixture.commit.mockRejectedValueOnce(new Error("private provider failure"));
  await expect(allowed.commit(commitCommand())).resolves.toEqual({
    code: "store-commit-unavailable",
    status: "unavailable"
  });
});

it("rejects concurrent external updates by default and applies later valid subscriptions", async () => {
  const fixture = adapterFixture(snapshot("revision-1", "Ada"));
  const pending = deferred<UiAsyncStoreCommitResult>();
  fixture.commit.mockReturnValueOnce(pending.promise);
  const session = await connectedSession(fixture.adapter, allowAll());
  const events: unknown[] = [];
  session.subscribe((event) => events.push(event));
  const committing = session.commit(commitCommand());
  fixture.publish(snapshot("revision-external", "External"));
  pending.resolve({ snapshot: snapshot("revision-2", "Grace"), status: "committed" });
  await committing;
  fixture.publish(snapshot("revision-3", "Katherine"));
  expect(events).toMatchObject([
    { snapshot: snapshot("revision-2", "Grace"), status: "updated" },
    { code: "store-concurrent-update", status: "conflict" },
    { snapshot: snapshot("revision-3", "Katherine"), status: "updated" }
  ]);
});

it("suppresses a local subscription echo and rejects malformed provider statuses", async () => {
  const fixture = adapterFixture(snapshot("revision-1", "Ada"));
  const pending = deferred<UiAsyncStoreCommitResult>();
  fixture.commit.mockReturnValueOnce(pending.promise);
  const session = await connectedSession(fixture.adapter, allowAll());
  const events: unknown[] = [];
  session.subscribe((event) => events.push(event));
  const committing = session.commit(commitCommand());
  fixture.publish(snapshot("revision-2", "Grace"));
  pending.resolve({ snapshot: snapshot("revision-2", "Grace"), status: "committed" });
  await expect(committing).resolves.toMatchObject({ status: "committed" });
  expect(events).toHaveLength(1);
  fixture.commit.mockResolvedValueOnce({
    status: "provider-private"
  } as unknown as UiAsyncStoreCommitResult);
  await expect(
    session.commit({ ...commitCommand(), expectedRevision: "revision-2" })
  ).resolves.toEqual({
    code: "store-commit-result-invalid",
    status: "invalid"
  });
});

it("queues a concurrent subscription under the explicit external-wins policy", async () => {
  const fixture = adapterFixture(snapshot("revision-1", "Ada"));
  const pending = deferred<UiAsyncStoreCommitResult>();
  fixture.commit.mockReturnValueOnce(pending.promise);
  const result = await connectAsyncStore(storeDefinition(), fixture.adapter, {
    authorization: allowAll(),
    conflictPolicy: "external-wins"
  });
  const session = requireSession(result.session);
  const committing = session.commit(commitCommand());
  fixture.publish(snapshot("revision-3", "External"));
  pending.resolve({ snapshot: snapshot("revision-2", "Grace"), status: "committed" });
  await committing;
  expect(session.snapshot).toEqual(snapshot("revision-3", "External"));
});

it("rejects invalid external values and makes disposal idempotent", async () => {
  const fixture = adapterFixture(snapshot("revision-1", "Ada"));
  const session = await connectedSession(fixture.adapter, allowAll());
  const events: unknown[] = [];
  session.subscribe(() => {
    throw new Error("private listener failure");
  });
  session.subscribe((event) => events.push(event));
  fixture.publish({ ...snapshot("revision-2", "Grace"), value: { name: 42 } });
  fixture.publish(snapshot("revision-1", "Ada"));
  expect(events).toEqual([{ code: "store-external-invalid", status: "rejected" }]);
  session.dispose();
  session.dispose();
  fixture.publish(snapshot("revision-3", "Ignored"));
  expect(session.subscribe(() => undefined)()).toBeUndefined();
  await expect(session.commit(commitCommand())).resolves.toMatchObject({ status: "unavailable" });
});

it("rejects invalid commit snapshots, cancellation, and overlapping local commits", async () => {
  const fixture = adapterFixture(snapshot("revision-1", "Ada"));
  fixture.commit.mockResolvedValueOnce({ status: "committed" });
  const session = await connectedSession(fixture.adapter, allowAll());
  await expect(session.commit(commitCommand())).resolves.toMatchObject({ status: "invalid" });
  fixture.commit.mockResolvedValueOnce({
    snapshot: snapshot("revision-1", "Grace"),
    status: "committed"
  });
  await expect(session.commit(commitCommand())).resolves.toMatchObject({ status: "invalid" });
  const pending = deferred<UiAsyncStoreCommitResult>();
  fixture.commit.mockReturnValueOnce(pending.promise);
  const controller = new AbortController();
  const committing = session.commit({ ...commitCommand(), signal: controller.signal });
  await expect(session.commit(commitCommand())).resolves.toMatchObject({ status: "conflict" });
  controller.abort();
  pending.resolve({ snapshot: snapshot("revision-2", "Grace"), status: "committed" });
  await expect(committing).resolves.toMatchObject({ status: "cancelled" });
});

function adapterFixture(initial: UiAsyncStoreSnapshot) {
  let listener: ((snapshot: UiAsyncStoreSnapshot) => void) | undefined;
  const commit = vi.fn<UiAsyncStoreAdapter["commit"]>();
  const unsubscribe = vi.fn();
  return {
    adapter: {
      commit,
      load: async () => initial,
      subscribe: (next: (snapshot: UiAsyncStoreSnapshot) => void) => {
        listener = next;
        return unsubscribe;
      },
      version: "2.1.0"
    },
    commit,
    publish: (value: UiAsyncStoreSnapshot) => listener?.(value),
    unsubscribe
  };
}

async function connectedSession(
  adapter: UiAsyncStoreAdapter,
  authorization: UiStoreSinkAuthorizationPort
) {
  const result = await connectAsyncStore(storeDefinition(), adapter, { authorization });
  return requireSession(result.session);
}

function requireSession<T>(session: T | undefined): T {
  if (session === undefined) throw new Error("Expected an async store session.");
  return session;
}

function snapshot(revision: string, name: string): UiAsyncStoreSnapshot {
  return { dataVersion: "2.1.0", revision, value: { name } };
}

function commitCommand() {
  return {
    expectedRevision: "revision-1",
    idempotencyKey: "commit-1",
    path: "/name",
    value: "Grace"
  };
}

function allowAll(): UiStoreSinkAuthorizationPort {
  return { decide: async () => true };
}

function operationAuthorization(
  operation: "commit" | "load" | "subscribe",
  decision: boolean
): UiStoreSinkAuthorizationPort {
  return { decide: async (request) => (request.operation === operation ? decision : true) };
}

function expectLoadAuthorized(decide: ReturnType<typeof vi.fn>): void {
  expect(decide).toHaveBeenCalledWith({
    classification: DataClassification.Internal,
    operation: "load",
    storeId: "customer"
  });
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((complete) => {
    resolve = (value) => void complete(value);
  });
  return { promise, resolve };
}
