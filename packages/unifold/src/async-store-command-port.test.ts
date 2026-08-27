import { UiCommandType, UiEventType, type UiEvent } from "@unislang/unifold-events";
import { UnifoldRuntime } from "@unislang/unifold-runtime";
import { expect, it, vi } from "vitest";

import { createApplicationSnapshots } from "./application-snapshots.js";
import { AsyncStoreCommandController } from "./async-store-command-port.js";
import { connectAsyncStore } from "./async-store-connection.js";
import { createAsyncMemoryStoreAdapter } from "./async-memory-store-adapter.js";
import type {
  UiAsyncStoreAdapter,
  UiAsyncStoreCommitResult,
  UiAsyncStoreSession,
  UiAsyncStoreSnapshot
} from "./async-store-types.js";
import { prepareUnifoldDocument } from "./compiler.js";
import { prepareApplicationStores } from "./store-adapters.js";
import { boundDocument } from "./store-adapters-base.test-data.js";
import { UnifoldPreparationStatus } from "./types.js";

it("serializes mounted writes and reads each optimistic revision at execution time", async () => {
  const first = deferred<UiAsyncStoreCommitResult>();
  const second = deferred<UiAsyncStoreCommitResult>();
  const commit = vi
    .fn<UiAsyncStoreAdapter["commit"]>()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const fixture = await controllerFixture(adapterWithCommit(commit));

  fixture.runtime.execute([setValue("Grace")]);
  fixture.runtime.execute([setValue("Katherine")]);
  await vi.waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
  first.resolve(committed("revision-2", "Grace"));
  await vi.waitFor(() => expect(commit).toHaveBeenCalledTimes(2));
  expect(commit.mock.calls[1]?.[0].expectedRevision).toBe("revision-2");
  second.resolve(committed("revision-3", "Katherine"));
  await vi.waitFor(() => expect(fixture.stores.values["customer"]).toEqual({ name: "Katherine" }));
  fixture.dispose();
});

it("projects an external snapshot through one transaction without a write echo", async () => {
  const adapter = createAsyncMemoryStoreAdapter("2.1.0", {
    initialSnapshot: snapshot("revision-1", "Ada")
  });
  const commit = vi.spyOn(adapter, "commit");
  const fixture = await controllerFixture(adapter);

  adapter.publish(snapshot("revision-external", "Grace"));
  await vi.waitFor(() => expect(controlValue(fixture.runtime)).toBe("Grace"));

  expect(fixture.runtime.revision).toBe(1);
  expect(commit).not.toHaveBeenCalled();
  expect(fixture.stores.values["customer"]).toEqual({ name: "Grace" });
  fixture.dispose();
});

it("rolls a rejected optimistic write back and reports an asynchronous effect failure", async () => {
  const commit = vi.fn<UiAsyncStoreAdapter["commit"]>().mockResolvedValue({ status: "conflict" });
  const fixture = await controllerFixture(adapterWithCommit(commit));
  const events: UiEvent[] = [];
  fixture.runtime.events$.subscribe((event) => events.push(event));

  fixture.runtime.execute([setValue("Grace")]);
  await vi.waitFor(() => expect(controlValue(fixture.runtime)).toBe("Ada"));
  await vi.waitFor(() =>
    expect(events.some(({ type }) => type === UiEventType.EffectFailed)).toBe(true)
  );

  expect(fixture.runtime.revision).toBe(2);
  const requested = events.filter(({ type }) => type === UiEventType.EffectRequested);
  const failed = events.filter(({ type }) => type === UiEventType.EffectFailed);
  expect(requested).toHaveLength(1);
  expect(failed.map(({ subject }) => subject)).toEqual([requested[0]?.subject]);
  fixture.dispose();
});

async function controllerFixture(adapter: UiAsyncStoreAdapter) {
  const document = compiledDocument();
  const session = await connectedSession(document.storesById["customer"], adapter);
  const stores = fixtureStores(document, session, adapter);
  return attachedFixture(document, session, stores);
}

function fixtureStores(
  document: ReturnType<typeof compiledDocument>,
  session: UiAsyncStoreSession,
  adapter: UiAsyncStoreAdapter
) {
  const stores = prepareApplicationStores(document, {
    customer: {
      load: () => session.snapshot?.value,
      version: adapter.version,
      write: () => undefined
    }
  });
  return stores;
}

function attachedFixture(
  document: ReturnType<typeof compiledDocument>,
  session: UiAsyncStoreSession,
  stores: ReturnType<typeof fixtureStores>
) {
  const controller = new AsyncStoreCommandController(
    document,
    stores,
    { customer: session },
    undefined
  );
  const runtime = new UnifoldRuntime({
    commandPort: controller,
    documentId: document.documentId,
    initialNodes: createApplicationSnapshots(document, 0, stores),
    storeBindings: stores.bindings
  });
  controller.attach(runtime);
  return {
    dispose: () => {
      controller.dispose();
      runtime.dispose();
    },
    runtime,
    stores
  };
}

function compiledDocument() {
  const result = prepareUnifoldDocument(boundDocument());
  expect(result.status).toBe(UnifoldPreparationStatus.Valid);
  const document = result.prepared?.document;
  if (document === undefined) throw new Error("Expected a compiled document.");
  return document;
}

async function connectedSession(
  definition: ReturnType<typeof compiledDocument>["storesById"][string] | undefined,
  adapter: UiAsyncStoreAdapter
): Promise<UiAsyncStoreSession> {
  if (definition === undefined) throw new Error("Expected a store definition.");
  const result = await connectAsyncStore(definition, adapter, {
    authorization: { decide: async () => true }
  });
  if (result.session === undefined) throw new Error("Expected a connected session.");
  return result.session;
}

function adapterWithCommit(commit: UiAsyncStoreAdapter["commit"]): UiAsyncStoreAdapter {
  return {
    commit,
    load: async () => snapshot("revision-1", "Ada"),
    version: "2.1.0"
  };
}

function committed(revision: string, name: string): UiAsyncStoreCommitResult {
  return { snapshot: snapshot(revision, name), status: "committed" };
}

function snapshot(revision: string, name: string): UiAsyncStoreSnapshot {
  return { dataVersion: "2.1.0", revision, value: { name } };
}

function setValue(value: string) {
  return { id: "name", type: UiCommandType.ControlSetValue, value } as const;
}

function controlValue(runtime: UnifoldRuntime) {
  return runtime.getSnapshot("name").control?.value;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}
