// @vitest-environment happy-dom
import { UiCommandType, UiEventType, type UiEvent } from "@unislang/unifold-events";
import { UiStoreInitialDataPolicy } from "@unislang/unifold-contracts";
import { expect, it, vi } from "vitest";
import { createTrustedLayoutDefinitionRegistry } from "@unislang/unifold-compositions";

import { mountUnifoldApplicationAsync } from "./async-mount.js";
import { createAsyncMemoryStoreAdapter } from "./async-memory-store-adapter.js";
import type {
  UiAsyncStoreAdapter,
  UiAsyncStoreAdapterCommitCommand,
  UiAsyncStoreSnapshot,
  UiStoreSinkAuthorizationPort
} from "./async-store-types.js";
import { boundDocument, storeDefinition } from "./store-adapters-base.test-data.js";
import { layoutDocument } from "./compiler-layout.test-data.js";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationMountStatus,
  UnifoldApplicationUpdateStatus,
  type MountUnifoldApplicationResult,
  type UnifoldApplicationPort
} from "./types.js";

it("waits for loading before render and coordinates local, external, and disposal lifecycle", async () => {
  const fixture = controllableAdapter();
  const container = document.createElement("div");
  const mounting = mountUnifoldApplicationAsync(boundDocument(), container, {
    asyncStoreAdapters: { customer: registration(fixture.adapter) }
  });
  expect(container.childElementCount).toBe(0);

  fixture.load.resolve(snapshot("revision-1", "Ada"));
  const application = requireApplication(await mounting);
  expect(application.runtime.getSnapshot("name").control?.value).toBe("Ada");
  const events: UiEvent[] = [];
  application.runtime.events$.subscribe((event) => events.push(event));

  application.runtime.execute([setValue("Grace")]);
  await vi.waitFor(() => expect(fixture.commit).toHaveBeenCalledOnce());
  expect(effectTypes(events)).toEqual([UiEventType.EffectRequested]);
  fixture.commitResult.resolve(committed(fixture.commit.mock.calls[0]?.[0], "revision-2"));
  await vi.waitFor(() => expect(effectTypes(events)).toContain(UiEventType.EffectCompleted));

  fixture.publish(snapshot("revision-3", "Katherine"));
  await vi.waitFor(() =>
    expect(application.runtime.getSnapshot("name").control?.value).toBe("Katherine")
  );
  expect(fixture.commit).toHaveBeenCalledTimes(1);
  application.dispose();
  expect(fixture.unsubscribe).toHaveBeenCalledOnce();
});

it("rejects a changed store contract without disturbing the mounted session", async () => {
  const adapter = createAsyncMemoryStoreAdapter("2.1.0", {
    initialSnapshot: snapshot("revision-1", "Ada")
  });
  const application = requireApplication(
    await mountUnifoldApplicationAsync(boundDocument(), document.createElement("div"), {
      asyncStoreAdapters: { customer: registration(adapter) }
    })
  );
  const authored = boundDocument();
  const changed = { ...authored, stores: [{ ...storeDefinition(), maxBytes: 32_768 }] };

  const result = application.update(changed);

  expect(result.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(result.diagnostics).toMatchObject([
    { code: "async-store-definition-changed", stage: UnifoldApplicationDiagnosticStage.Store }
  ]);
  expect(application.runtime.getSnapshot("name").control?.value).toBe("Ada");
  application.dispose();
});

it("disposes successful peer connections when one store fails atomically", async () => {
  const first = immediateAdapter(snapshot("revision-1", "Ada"));
  const second = immediateAdapter(snapshot("revision-1", "Austin"));
  const container = document.createElement("div");
  container.innerHTML = "<p>Fallback</p>";

  const result = await mountUnifoldApplicationAsync(twoStoreDocument(), container, {
    asyncStoreAdapters: {
      address: registration(second.adapter, denyLoad()),
      customer: registration(first.adapter)
    }
  });

  expect(result.status).toBe(UnifoldApplicationMountStatus.Rejected);
  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Store);
  expect(first.unsubscribe).toHaveBeenCalledOnce();
  expect(container.innerHTML).toBe("<p>Fallback</p>");
});

it("creates the first revision for an optional initially empty store", async () => {
  const adapter = createAsyncMemoryStoreAdapter("2.1.0");
  const authored = {
    ...boundDocument(),
    stores: [storeDefinition(UiStoreInitialDataPolicy.Optional)]
  };
  const application = requireApplication(
    await mountUnifoldApplicationAsync(authored, document.createElement("div"), {
      asyncStoreAdapters: { customer: registration(adapter) }
    })
  );

  application.runtime.execute([setValue("Grace")]);
  await vi.waitFor(() => expect(adapter.snapshot()?.value).toEqual({ name: "Grace" }));

  expect(adapter.snapshot()?.revision).toBe("memory-1");
  application.dispose();
});

it("retains a trusted external layout registry across async wrapper updates", async () => {
  const source = layoutDocument();
  const layoutRegistry = createTrustedLayoutDefinitionRegistry(source.layouts);
  Reflect.deleteProperty(source, "layouts");
  const application = requireApplication(
    await mountUnifoldApplicationAsync(source, document.createElement("div"), { layoutRegistry })
  );
  const next = structuredClone(source);
  next.revision = "2";
  expect(application.update(next).status).toBe(UnifoldApplicationUpdateStatus.Applied);
  application.dispose();
});

function controllableAdapter() {
  const load = deferred<UiAsyncStoreSnapshot | undefined>();
  const commitResult = deferred<ReturnType<typeof committed>>();
  const commit = vi.fn<UiAsyncStoreAdapter["commit"]>(() => commitResult.promise);
  const unsubscribe = vi.fn();
  let listener: ((value: UiAsyncStoreSnapshot) => void) | undefined;
  return {
    adapter: {
      commit,
      load: () => load.promise,
      subscribe: (next: (value: UiAsyncStoreSnapshot) => void) => {
        listener = next;
        return unsubscribe;
      },
      version: "2.1.0"
    },
    commit,
    commitResult,
    load,
    publish: (value: UiAsyncStoreSnapshot) => listener?.(value),
    unsubscribe
  };
}

function immediateAdapter(initial: UiAsyncStoreSnapshot) {
  const unsubscribe = vi.fn();
  return {
    adapter: {
      commit: async () => ({ status: "conflict" as const }),
      load: async () => initial,
      subscribe: () => unsubscribe,
      version: "2.1.0"
    },
    unsubscribe
  };
}

function registration(
  adapter: UiAsyncStoreAdapter,
  authorization: UiStoreSinkAuthorizationPort = allowAll()
) {
  return { adapter, authorization };
}

function allowAll(): UiStoreSinkAuthorizationPort {
  return { decide: async () => true };
}

function denyLoad(): UiStoreSinkAuthorizationPort {
  return { decide: async ({ operation }) => operation !== "load" };
}

function committed(command: UiAsyncStoreAdapterCommitCommand | undefined, revision: string) {
  if (command === undefined) throw new Error("Expected an adapter commit command.");
  return {
    snapshot: { dataVersion: command.dataVersion, revision, value: command.candidate },
    status: "committed" as const
  };
}

function snapshot(revision: string, name: string): UiAsyncStoreSnapshot {
  return { dataVersion: "2.1.0", revision, value: { name } };
}

function setValue(value: string) {
  return { id: "name", type: UiCommandType.ControlSetValue, value } as const;
}

function effectTypes(events: readonly UiEvent[]): string[] {
  return events.filter(({ data }) => data.phase === "effect").map(({ type }) => type);
}

function requireApplication(result: MountUnifoldApplicationResult): UnifoldApplicationPort {
  expect(result.status).toBe(UnifoldApplicationMountStatus.Mounted);
  if (result.status === UnifoldApplicationMountStatus.Rejected) {
    throw new Error(`Expected a mounted application: ${JSON.stringify(result.diagnostics)}`);
  }
  return result.application;
}

function twoStoreDocument() {
  const customer = storeDefinition();
  return {
    ...boundDocument(),
    stores: [customer, { ...customer, id: "address" }],
    view: {
      $children: [
        { $comp: "TextField", id: "name", path: "/name", store: "customer" },
        { $comp: "TextField", id: "city", path: "/name", store: "address" }
      ],
      $comp: "Form",
      id: "form"
    }
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}
