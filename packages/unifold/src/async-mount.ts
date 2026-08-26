import type { UiStoreDefinition } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import { AsyncStoreCommandController } from "./async-store-command-port.js";
import { AsyncMountedApplication } from "./async-mounted-application.js";
import { connectAsyncStore } from "./async-store-connection.js";
import type {
  MountAsyncUnifoldApplicationOptions,
  UiAsyncStoreConnectionOptions,
  UiAsyncStoreConnectionResult,
  UiAsyncStoreRegistration,
  UiAsyncStoreRegistry,
  UiAsyncStoreSession
} from "./async-store-types.js";
import { prepareUnifoldDocument } from "./compiler.js";
import { mountPreparedUnifoldApplicationWithStores } from "./mount.js";
import { prepareApplicationStores } from "./store-adapters.js";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationMountStatus,
  UnifoldPreparationStatus,
  type MountUnifoldApplicationOptions,
  type MountUnifoldApplicationResult,
  type PreparedUnifoldDocument,
  type UiStoreAdapterRegistry
} from "./types.js";
export async function mountUnifoldApplicationAsync(
  authored: unknown,
  container: HTMLElement,
  options: MountAsyncUnifoldApplicationOptions = {}
): Promise<MountUnifoldApplicationResult> {
  const preparation = prepareUnifoldDocument(authored, options);
  if (preparation.status === UnifoldPreparationStatus.Invalid) {
    return { diagnostics: preparation.diagnostics, status: UnifoldApplicationMountStatus.Rejected };
  }
  return mountPreparedAsync(requirePrepared(preparation.prepared), container, options);
}
async function mountPreparedAsync(
  prepared: PreparedUnifoldDocument,
  container: HTMLElement,
  options: MountAsyncUnifoldApplicationOptions
): Promise<MountUnifoldApplicationResult> {
  const connected = await connectDocumentStores(
    prepared.document,
    options.asyncStoreAdapters ?? {},
    options.signal
  );
  if (connected instanceof Error) return rejectedMount(connected.message);
  return mountConnected(prepared, container, options, connected);
}

function mountConnected(
  prepared: PreparedUnifoldDocument,
  container: HTMLElement,
  options: MountAsyncUnifoldApplicationOptions,
  connected: ConnectedStores
): MountUnifoldApplicationResult {
  try {
    const bridges = bridgeAdapters(connected);
    const stores = prepareApplicationStores(prepared.document, bridges);
    const controller = new AsyncStoreCommandController(
      prepared.document,
      stores,
      connected.sessions,
      options.runtime?.commandPort
    );
    return mountWithController(
      prepared,
      container,
      mountOptions(options, bridges),
      controller,
      stores
    );
  } catch (error) {
    disposeSessions(connected.sessions);
    return rejectedMount(safeErrorMessage(error));
  }
}

function mountWithController(
  prepared: PreparedUnifoldDocument,
  container: HTMLElement,
  options: MountUnifoldApplicationOptions,
  controller: AsyncStoreCommandController,
  stores: ReturnType<typeof prepareApplicationStores>
): MountUnifoldApplicationResult {
  const result = mountPreparedUnifoldApplicationWithStores(
    prepared,
    container,
    options,
    stores,
    controller
  );
  if (result.status === UnifoldApplicationMountStatus.Rejected) {
    controller.dispose();
    return result;
  }
  return attachController(result, controller, prepared.document, options);
}

function attachController(
  result: Extract<MountUnifoldApplicationResult, { application: unknown }>,
  controller: AsyncStoreCommandController,
  document: UnifoldIrDocument,
  options: MountUnifoldApplicationOptions
): MountUnifoldApplicationResult {
  try {
    controller.attach(result.application.runtime);
    return {
      ...result,
      application: new AsyncMountedApplication(result.application, controller, document, options)
    };
  } catch (error) {
    result.application.dispose();
    controller.dispose();
    return rejectedMount(safeErrorMessage(error));
  }
}

interface ConnectedStores {
  readonly adapters: Readonly<Record<string, UiAsyncStoreRegistration["adapter"]>>;
  readonly sessions: Readonly<Record<string, UiAsyncStoreSession>>;
}

async function connectDocumentStores(
  document: UnifoldIrDocument,
  registry: UiAsyncStoreRegistry,
  signal?: AbortSignal
): Promise<ConnectedStores | Error> {
  const outcomes = await Promise.all(
    Object.values(document.storesById).map((definition) =>
      connectDefinition(definition, registry, signal)
    )
  );
  const failure = outcomes.find((outcome) => outcome instanceof Error);
  if (failure !== undefined) {
    outcomes.forEach((outcome) => {
      if (!(outcome instanceof Error)) outcome.session.dispose();
    });
    return failure;
  }
  return connectedStores(outcomes as readonly ConnectedStore[]);
}

interface ConnectedStore {
  readonly adapter: UiAsyncStoreRegistration["adapter"];
  readonly id: string;
  readonly session: UiAsyncStoreSession;
}

async function connectDefinition(
  definition: UiStoreDefinition,
  registry: UiAsyncStoreRegistry,
  signal?: AbortSignal
): Promise<ConnectedStore | Error> {
  const registration = registeredStore(registry, definition.id);
  if (registration instanceof Error) return registration;
  const result = await connectAsyncStore(
    definition,
    registration.adapter,
    connectionOptions(registration, signal)
  );
  return connectedDefinition(definition.id, registration, result);
}

function registeredStore(
  registry: UiAsyncStoreRegistry,
  id: string
): UiAsyncStoreRegistration | Error {
  const registration = Object.hasOwn(registry, id) ? registry[id] : undefined;
  return registration ?? new Error(`Async store adapter is missing: ${id}.`);
}

function connectedDefinition(
  id: string,
  registration: UiAsyncStoreRegistration,
  result: UiAsyncStoreConnectionResult
): ConnectedStore | Error {
  if (result.status !== "connected") return connectionError(result);
  if (result.session === undefined) return connectionError(result);
  return { adapter: registration.adapter, id, session: result.session };
}

function connectionError(result: UiAsyncStoreConnectionResult): Error {
  return new Error(`Async store connection failed: ${result.code ?? result.status}.`);
}

function connectionOptions(
  registration: UiAsyncStoreRegistration,
  signal?: AbortSignal
): UiAsyncStoreConnectionOptions {
  return {
    authorization: registration.authorization,
    ...conflictOption(registration),
    ...migrationOption(registration),
    ...signalOption(signal)
  };
}

function conflictOption(registration: UiAsyncStoreRegistration) {
  return registration.conflictPolicy === undefined
    ? {}
    : { conflictPolicy: registration.conflictPolicy };
}

function migrationOption(registration: UiAsyncStoreRegistration) {
  return registration.migrations === undefined ? {} : { migrations: registration.migrations };
}

function signalOption(signal?: AbortSignal) {
  return signal === undefined ? {} : { signal };
}

function connectedStores(values: readonly ConnectedStore[]): ConnectedStores {
  return {
    adapters: Object.fromEntries(values.map(({ adapter, id }) => [id, adapter])),
    sessions: Object.fromEntries(values.map(({ id, session }) => [id, session]))
  };
}

function bridgeAdapters(connected: ConnectedStores): UiStoreAdapterRegistry {
  return Object.fromEntries(
    Object.entries(connected.sessions).map(([id, session]) => [
      id,
      {
        load: () => session.snapshot?.value,
        version: connected.adapters[id]?.version ?? "",
        write: () => undefined
      }
    ])
  );
}

function mountOptions(
  options: MountAsyncUnifoldApplicationOptions,
  storeAdapters: UiStoreAdapterRegistry
): MountUnifoldApplicationOptions {
  const shared = { ...options };
  Reflect.deleteProperty(shared, "asyncStoreAdapters");
  Reflect.deleteProperty(shared, "signal");
  return { ...shared, storeAdapters };
}

function disposeSessions(sessions: ConnectedStores["sessions"]): void {
  Object.values(sessions).forEach((session) => session.dispose());
}

function rejectedMount(message: string): MountUnifoldApplicationResult {
  return {
    diagnostics: [
      {
        code: "application-mount-failed",
        message,
        path: "/stores",
        stage: UnifoldApplicationDiagnosticStage.Store
      }
    ],
    status: UnifoldApplicationMountStatus.Rejected
  };
}

function requirePrepared(value: PreparedUnifoldDocument | undefined): PreparedUnifoldDocument {
  if (value === undefined) throw new Error("A valid preparation result has no document.");
  return value;
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown async store mount failure.";
}
