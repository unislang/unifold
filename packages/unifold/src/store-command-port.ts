import {
  UiStoreAccess,
  UiStoreInitialDataPolicy,
  type JsonValue,
  type UiStoreDefinition
} from "@unislang/unifold-contracts";
import { UiCommandType, type StoreWriteCommand } from "@unislang/unifold-events";
import {
  StoreInputStatus,
  validateStoreInput,
  type UnifoldIrDocument,
  type UnifoldIrNode
} from "@unislang/unifold-ir";
import type { UiCommandPort } from "@unislang/unifold-runtime";

import {
  UiStoreConfigurationError,
  assertSynchronous,
  safeStoreWrite,
  type PreparedApplicationStores
} from "./store-adapters.js";
import type { UiStoreAdapter, UiStoreAdapterRegistry } from "./types.js";

export interface StoreCommandController extends UiCommandPort {
  replace(document: UnifoldIrDocument, stores: PreparedApplicationStores): void;
}

export function createStoreCommandPort(
  document: UnifoldIrDocument,
  stores: PreparedApplicationStores,
  adapters: UiStoreAdapterRegistry,
  fallback?: UiCommandPort
): StoreCommandController {
  let activeDocument = document;
  let activeStores = stores;
  return {
    execute(command, context) {
      if (command.type === UiCommandType.StoreWrite) {
        return writeStore(command, activeDocument, activeStores, adapters);
      }
      fallback?.execute(command, context);
    },
    replace(nextDocument, nextStores) {
      activeDocument = nextDocument;
      activeStores = nextStores;
    }
  };
}

function writeStore(
  command: StoreWriteCommand,
  document: UnifoldIrDocument,
  stores: PreparedApplicationStores,
  adapters: UiStoreAdapterRegistry
): void {
  const definition = authorizedStoreDefinition(command, document);
  const adapter = requireAuthorizedAdapter(definition, adapters);
  const current = ownValue(stores.values, command.storeId);
  const candidate = safeStoreWrite(current, command.path, command.value);
  assertStoreCandidate(definition, adapter.version, candidate);
  executeStoreWrite(adapter, command);
  Reflect.set(stores.values, command.storeId, candidate);
}

export function authorizedStoreDefinition(
  command: StoreWriteCommand,
  document: UnifoldIrDocument
): UiStoreDefinition {
  const node = ownValue(document.nodesById, command.id);
  const definition = ownValue(document.storesById, command.storeId);
  assertAuthorizedBinding(node, command);
  return requireWritableDefinition(definition);
}

function assertAuthorizedBinding(
  node: UnifoldIrNode | undefined,
  command: StoreWriteCommand
): void {
  if (node === undefined) throw storeAuthorizationError();
  if (!matchesBinding(node.binding, command)) throw storeAuthorizationError();
}

function requireWritableDefinition(definition: UiStoreDefinition | undefined): UiStoreDefinition {
  if (definition?.access !== UiStoreAccess.ReadWriteDraft) throw storeAuthorizationError();
  return definition;
}

function matchesBinding(
  binding: { readonly path: string; readonly store: string } | undefined,
  command: StoreWriteCommand
): boolean {
  if (binding === undefined) return false;
  return binding.store === command.storeId && binding.path === command.path;
}

function requireAuthorizedAdapter(
  definition: UiStoreDefinition,
  adapters: UiStoreAdapterRegistry
): UiStoreAdapter {
  const adapter = ownValue(adapters, definition.id);
  if (adapter?.write === undefined) throw storeAuthorizationError();
  return adapter;
}

function assertStoreCandidate(
  definition: UiStoreDefinition,
  version: string,
  value: JsonValue
): void {
  const writable = { ...definition, initialData: UiStoreInitialDataPolicy.Optional };
  const validation = validateStoreInput(writable, version, value);
  if (validation.status !== StoreInputStatus.Valid) throw storeWriteError();
}

function executeStoreWrite(adapter: UiStoreAdapter, command: StoreWriteCommand): void {
  try {
    const result = adapter.write?.(command.path, structuredClone(command.value)) as unknown;
    assertSynchronous(result);
  } catch {
    throw new UiStoreConfigurationError("Store adapter failed to write.");
  }
}

function ownValue<T>(values: Readonly<Record<string, T>>, id: string): T | undefined {
  return Object.hasOwn(values, id) ? values[id] : undefined;
}

function storeAuthorizationError(): UiStoreConfigurationError {
  return new UiStoreConfigurationError("Store write is not authorized.");
}

function storeWriteError(): UiStoreConfigurationError {
  return new UiStoreConfigurationError("Store write is invalid.");
}
