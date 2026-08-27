import {
  UnifoldApplicationMountStatus,
  UnifoldApplicationUpdateStatus,
  createAsyncMemoryStoreAdapter,
  createMemoryStoreAdapter,
  mountUnifoldApplicationAsync,
  mountUnifoldApplication,
  type UiAsyncMemoryStoreAdapter,
  type UnifoldApplicationPort
} from "@unislang/unifold";

type StoreDocument = ReturnType<typeof storeDocument>;
type StoreAdapter = ReturnType<typeof createMemoryStoreAdapter>;

interface MountedStoreFixture {
  readonly adapter: StoreAdapter;
  readonly application: UnifoldApplicationPort;
  authored: StoreDocument;
  readonly container: HTMLElement;
  readonly sibling: HTMLElement;
  readonly siblingRenderCount: string | undefined;
}

interface StoreFixtureWindow {
  __unifoldStoreFixture?: {
    mount(): StoreFixtureMountObservation;
    observe(): StoreFixtureObservation;
    reject(mode: StoreFixtureRejectMode): StoreFixtureMountObservation;
    updatePath(path: string): UnifoldApplicationUpdateStatus;
  };
  __unifoldAsyncStoreFixture?: {
    mount(): Promise<StoreFixtureMountObservation>;
    observe(): AsyncStoreFixtureObservation;
    publish(value: string): void;
  };
}

interface StoreFixtureMountObservation {
  readonly childCount: number;
  readonly diagnostics: readonly { readonly stage: string }[];
  readonly status: UnifoldApplicationMountStatus;
}

interface StoreFixtureObservation {
  readonly siblingRenderCount: string | undefined;
  readonly siblingRetained: boolean;
  readonly snapshot: unknown;
}

interface AsyncStoreFixtureObservation {
  readonly commits: number;
  readonly runtimeValue: unknown;
  readonly snapshot: unknown;
}

enum StoreFixtureRejectMode {
  Invalid = "invalid",
  Missing = "missing"
}

let mounted: MountedStoreFixture | undefined;
let mountedAsync: MountedAsyncStoreFixture | undefined;

interface MountedAsyncStoreFixture {
  readonly adapter: UiAsyncMemoryStoreAdapter;
  readonly application: UnifoldApplicationPort;
  readonly commits: () => number;
  readonly container: HTMLElement;
}

function installStoreFixtureHooks(): void {
  const target = window as unknown as StoreFixtureWindow;
  target.__unifoldStoreFixture = {
    mount: mountStoreFixture,
    observe: observeStoreFixture,
    reject: rejectStoreFixture,
    updatePath: updateStorePath
  };
  target.__unifoldAsyncStoreFixture = {
    mount: mountAsyncStoreFixture,
    observe: observeAsyncStoreFixture,
    publish: publishAsyncStoreFixture
  };
}

installStoreFixtureHooks();

async function mountAsyncStoreFixture(): Promise<StoreFixtureMountObservation> {
  disposeAsyncStoreFixture();
  const container = document.createElement("div");
  container.dataset["testid"] = "async-store-fixture";
  document.body.append(container);
  const fixture = countedAsyncAdapter();
  const result = await mountUnifoldApplicationAsync(
    storeDocument("/primary", "async-store-1"),
    container,
    {
      asyncStoreAdapters: {
        customer: { adapter: fixture.adapter, authorization: { decide: async () => true } }
      }
    }
  );
  if (result.status === UnifoldApplicationMountStatus.Rejected) {
    return mountObservation(result.status, container, result.diagnostics);
  }
  mountedAsync = { ...fixture, application: result.application, container };
  return mountObservation(result.status, container, result.diagnostics);
}

function countedAsyncAdapter() {
  const memory = createAsyncMemoryStoreAdapter("2.1.0", {
    initialSnapshot: {
      dataVersion: "2.1.0",
      revision: "revision-1",
      value: { primary: "Ada", secondary: "Katherine" }
    }
  });
  let commitCount = 0;
  const adapter: UiAsyncMemoryStoreAdapter = {
    commit: (command) => {
      commitCount += 1;
      return memory.commit(command);
    },
    load: (signal) => memory.load(signal),
    publish: (snapshot) => memory.publish(snapshot),
    snapshot: () => memory.snapshot(),
    subscribe: (listener) => subscribeMemory(memory, listener),
    version: memory.version
  };
  return { adapter, commits: () => commitCount };
}

function subscribeMemory(
  adapter: UiAsyncMemoryStoreAdapter,
  listener: Parameters<NonNullable<UiAsyncMemoryStoreAdapter["subscribe"]>>[0]
): () => void {
  const subscribe = adapter.subscribe;
  if (subscribe === undefined) return () => undefined;
  return subscribe.call(adapter, listener);
}

function observeAsyncStoreFixture(): AsyncStoreFixtureObservation {
  const fixture = requireAsyncStoreFixture();
  return {
    commits: fixture.commits(),
    runtimeValue: fixture.application.runtime.getSnapshot("store-name").control?.value,
    snapshot: fixture.adapter.snapshot()?.value
  };
}

function publishAsyncStoreFixture(value: string): void {
  const fixture = requireAsyncStoreFixture();
  fixture.adapter.publish({
    dataVersion: "2.1.0",
    revision: `external-${value}`,
    value: { primary: value, secondary: "Katherine" }
  });
}

function mountStoreFixture(): StoreFixtureMountObservation {
  disposeStoreFixture();
  const container = document.createElement("div");
  container.dataset["testid"] = "store-fixture";
  document.body.append(container);
  const adapter = createMemoryStoreAdapter("2.1.0", {
    primary: "Ada",
    secondary: "Katherine"
  });
  const authored = storeDocument("/primary", "store-1");
  const result = mountUnifoldApplication(authored, container, {
    storeAdapters: { customer: adapter }
  });
  if (result.status === UnifoldApplicationMountStatus.Rejected) {
    return mountObservation(result.status, container, result.diagnostics);
  }
  const sibling = requireElement(result.application, "store-sibling");
  mounted = {
    adapter,
    application: result.application,
    authored,
    container,
    sibling,
    siblingRenderCount: sibling.dataset["unifoldRenderCount"]
  };
  return mountObservation(result.status, container, result.diagnostics);
}

function observeStoreFixture(): StoreFixtureObservation {
  const fixture = requireStoreFixture();
  const sibling = fixture.application.renderer.getElement("store-sibling");
  return {
    siblingRenderCount: sibling?.dataset["unifoldRenderCount"],
    siblingRetained: sibling === fixture.sibling,
    snapshot: fixture.adapter.snapshot()
  };
}

function updateStorePath(path: string): UnifoldApplicationUpdateStatus {
  const fixture = requireStoreFixture();
  const authored = structuredClone(fixture.authored);
  authored.revision = "store-2";
  const field = authored.view.$children[0];
  if (field === undefined) throw new Error("The store field is missing.");
  field.path = path;
  const result = fixture.application.update(authored);
  if (result.status === UnifoldApplicationUpdateStatus.Applied) fixture.authored = authored;
  return result.status;
}

function rejectStoreFixture(mode: StoreFixtureRejectMode): StoreFixtureMountObservation {
  const container = document.createElement("div");
  document.body.append(container);
  const adapters =
    mode === StoreFixtureRejectMode.Missing
      ? {}
      : { customer: createMemoryStoreAdapter("2.1.0", { primary: 42, secondary: "Valid" }) };
  const result = mountUnifoldApplication(storeDocument("/primary", `store-${mode}`), container, {
    storeAdapters: adapters
  });
  const observation = mountObservation(result.status, container, result.diagnostics);
  if (result.status === UnifoldApplicationMountStatus.Mounted) result.application.dispose();
  container.remove();
  return observation;
}

function mountObservation(
  status: UnifoldApplicationMountStatus,
  container: HTMLElement,
  diagnostics: readonly { readonly stage: string }[]
): StoreFixtureMountObservation {
  return { childCount: container.childElementCount, diagnostics, status };
}

function disposeStoreFixture(): void {
  mounted?.application.dispose();
  mounted?.container.remove();
  mounted = undefined;
}

function disposeAsyncStoreFixture(): void {
  mountedAsync?.application.dispose();
  mountedAsync?.container.remove();
  mountedAsync = undefined;
}

function requireStoreFixture(): MountedStoreFixture {
  if (mounted === undefined) throw new Error("The store fixture is not mounted.");
  return mounted;
}

function requireAsyncStoreFixture(): MountedAsyncStoreFixture {
  if (mountedAsync === undefined) throw new Error("The async store fixture is not mounted.");
  return mountedAsync;
}

function requireElement(application: UnifoldApplicationPort, id: string): HTMLElement {
  const element = application.renderer.getElement(id);
  if (element === undefined) throw new Error(`The rendered fixture node is missing: ${id}.`);
  return element;
}

function storeDocument(path: string, revision: string) {
  return {
    $schema: "https://schemas.unifold.org/ui-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    compositions: [],
    id: "store-fixture",
    jsonUiProfile: {
      name: "unifold-jsonui",
      upstream: "5401b3d4900ca3032c108d6db00e8a819f4b28e9",
      version: "1.0.0"
    },
    revision,
    schemaVersion: "1.0.0",
    stores: [storeDefinition()],
    view: {
      $children: [
        { $comp: "TextField", id: "store-name", label: "Stored name", path, store: "customer" },
        { $comp: "Button", id: "store-sibling", label: "Store sibling" }
      ],
      $comp: "Form",
      id: "store-form",
      label: "Stored profile"
    }
  };
}

function storeDefinition() {
  return {
    access: "read-write-draft",
    classification: "internal",
    id: "customer",
    initialData: "required",
    maxBytes: 65_536,
    migrations: { maximum: "2.9.0", minimum: "2.0.0" },
    ownership: "host",
    persistence: "session",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: { primary: { type: "string" }, secondary: { type: "string" } },
      required: ["primary", "secondary"],
      type: "object"
    },
    schemaVersion: "1.0.0",
    source: { kind: "host" }
  };
}
