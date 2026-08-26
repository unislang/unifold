import type { UiStoreDefinition } from "@unislang/unifold-contracts";

import {
  authorizedStoreOperation,
  connectionFailure,
  isAborted,
  validatedSnapshot
} from "./async-store-session-helpers.js";
import { createAsyncStoreSession } from "./async-store-session.js";
import type {
  UiAsyncStoreAdapter,
  UiAsyncStoreConnectionOptions,
  UiAsyncStoreConnectionResult,
  UiAsyncStoreSnapshot
} from "./async-store-types.js";

export async function connectAsyncStore(
  definition: UiStoreDefinition,
  adapter: UiAsyncStoreAdapter,
  options: UiAsyncStoreConnectionOptions
): Promise<UiAsyncStoreConnectionResult> {
  const preparation = await prepareConnection(definition, adapter, options);
  return preparation.status === "ready"
    ? createConnectedSession(definition, adapter, options, preparation.snapshot)
    : preparation;
}

type ConnectionPreparation =
  | UiAsyncStoreConnectionResult
  | { readonly snapshot: UiAsyncStoreSnapshot | undefined; readonly status: "ready" };

async function prepareConnection(
  definition: UiStoreDefinition,
  adapter: UiAsyncStoreAdapter,
  options: UiAsyncStoreConnectionOptions
): Promise<ConnectionPreparation> {
  const admission = await connectionAdmission(definition, adapter, options);
  if (admission !== undefined) return admission;
  const loaded = await loadSnapshot(adapter, options.signal);
  return prepareLoadedSnapshot(definition, adapter, options, loaded);
}

async function connectionAdmission(
  definition: UiStoreDefinition,
  adapter: UiAsyncStoreAdapter,
  options: UiAsyncStoreConnectionOptions
): Promise<UiAsyncStoreConnectionResult | undefined> {
  const cancellation = connectionCancellation(options.signal);
  if (cancellation !== undefined) return cancellation;
  return authorizeUncancelledConnection(definition, adapter, options);
}

async function authorizeUncancelledConnection(
  definition: UiStoreDefinition,
  adapter: UiAsyncStoreAdapter,
  options: UiAsyncStoreConnectionOptions
): Promise<UiAsyncStoreConnectionResult | undefined> {
  const allowed = await connectionAuthorized(definition, adapter, options);
  if (!allowed) return connectionFailure("denied", "store-connection-denied");
  return connectionCancellation(options.signal);
}

function connectionCancellation(signal?: AbortSignal): UiAsyncStoreConnectionResult | undefined {
  return isAborted(signal) ? connectionFailure("cancelled", "store-cancelled") : undefined;
}

function prepareLoadedSnapshot(
  definition: UiStoreDefinition,
  adapter: UiAsyncStoreAdapter,
  options: UiAsyncStoreConnectionOptions,
  loaded: LoadResult
): ConnectionPreparation {
  if (loaded.status !== "loaded") return connectionFailure(loaded.status, loaded.code);
  const snapshot = validatedSnapshot(definition, adapter.version, loaded.snapshot, options);
  return snapshot instanceof Error
    ? connectionFailure("invalid", "store-input-invalid")
    : { snapshot, status: "ready" };
}

function createConnectedSession(
  definition: UiStoreDefinition,
  adapter: UiAsyncStoreAdapter,
  options: UiAsyncStoreConnectionOptions,
  snapshot: UiAsyncStoreSnapshot | undefined
): UiAsyncStoreConnectionResult {
  try {
    const session = createAsyncStoreSession(definition, adapter, options, snapshot);
    return { session, status: "connected" };
  } catch {
    return connectionFailure("unavailable", "store-subscription-unavailable");
  }
}

type LoadResult =
  | { readonly code: string; readonly status: "cancelled" | "unavailable" }
  | { readonly snapshot: UiAsyncStoreSnapshot | undefined; readonly status: "loaded" };

async function loadSnapshot(
  adapter: UiAsyncStoreAdapter,
  signal?: AbortSignal
): Promise<LoadResult> {
  try {
    const snapshot = await adapter.load(signal);
    if (isAborted(signal)) return { code: "store-cancelled", status: "cancelled" };
    return { snapshot, status: "loaded" };
  } catch {
    return { code: "store-load-unavailable", status: "unavailable" };
  }
}

async function connectionAuthorized(
  definition: UiStoreDefinition,
  adapter: UiAsyncStoreAdapter,
  options: UiAsyncStoreConnectionOptions
): Promise<boolean> {
  const requests = [authorizedStoreOperation(definition, options, "load")];
  if (adapter.subscribe !== undefined) {
    requests.push(authorizedStoreOperation(definition, options, "subscribe"));
  }
  const decisions = await Promise.all(requests);
  return decisions.every(Boolean);
}
