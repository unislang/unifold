import { split } from "@sagold/json-pointer";
import {
  UiStoreAccess,
  type JsonArray,
  type JsonObject,
  type JsonValue,
  type UiStoreDefinition
} from "@unislang/unifold-contracts";
import type { UiNodeSnapshot } from "@unislang/unifold-events";
import {
  StoreInputStatus,
  validateStoreInput,
  type UnifoldIrDocument,
  type UnifoldIrNode
} from "@unislang/unifold-ir";
import type { UiRuntimeStoreBinding } from "@unislang/unifold-runtime";

import type { UiStoreAdapter, UiStoreAdapterRegistry } from "./types.js";

export interface PreparedApplicationStores {
  readonly bindings: Readonly<Record<string, UiRuntimeStoreBinding>>;
  readonly values: Readonly<Record<string, JsonValue | undefined>>;
}

export class UiStoreConfigurationError extends Error {}

export function prepareApplicationStores(
  document: UnifoldIrDocument,
  adapters: UiStoreAdapterRegistry = {}
): PreparedApplicationStores {
  const values = Object.create(null) as Record<string, JsonValue | undefined>;
  Object.values(document.storesById).forEach((definition) => {
    const adapter = requireAdapter(definition, adapters);
    const value = loadAdapter(adapter, definition.id);
    assertStoreInput(definition, adapter.version, value);
    assertWritableAdapter(definition, adapter);
    values[definition.id] = value === undefined ? undefined : structuredClone(value);
  });
  return { bindings: writableBindings(document), values };
}

export function applyStoreSnapshot(
  document: UnifoldIrDocument,
  node: UnifoldIrNode,
  snapshot: UiNodeSnapshot,
  stores: PreparedApplicationStores
): UiNodeSnapshot {
  const binding = node.binding;
  if (binding === undefined) return snapshot;
  const definition = requireDefinition(document, binding.store);
  const classified = withStorePolicy(snapshot, definition);
  const storeValue = ownValue(stores.values, binding.store);
  if (storeValue === undefined) return classified;
  const value = ownStoreValue(storeValue, binding.path);
  return hydrateStoreValue(classified, value);
}

export function createMemoryStoreAdapter(
  version: string,
  initial: JsonValue
): UiStoreAdapter & { snapshot(): JsonValue } {
  let value = structuredClone(initial);
  return {
    load: () => structuredClone(value),
    snapshot: () => structuredClone(value),
    version,
    write: (path, next) => {
      value = safeStoreWrite(value, path, next);
    }
  };
}

function requireAdapter(
  definition: UiStoreDefinition,
  adapters: UiStoreAdapterRegistry
): UiStoreAdapter {
  const adapter = ownValue(adapters, definition.id);
  if (adapter !== undefined) return adapter;
  throw new UiStoreConfigurationError(`Store adapter is missing: ${definition.id}.`);
}

function loadAdapter(adapter: UiStoreAdapter, id: string): JsonValue | undefined {
  try {
    const value = adapter.load() as unknown;
    assertSynchronous(value);
    return value as JsonValue | undefined;
  } catch {
    throw new UiStoreConfigurationError(`Store adapter failed to load: ${id}.`);
  }
}

function assertStoreInput(
  definition: UiStoreDefinition,
  version: string,
  value: JsonValue | undefined
): void {
  const validation = validateStoreInput(definition, version, value);
  if (validation.status === StoreInputStatus.Valid) return;
  throw new UiStoreConfigurationError(`Store input ${definition.id} is ${validation.status}.`);
}

function assertWritableAdapter(definition: UiStoreDefinition, adapter: UiStoreAdapter): void {
  if (definition.access === UiStoreAccess.ReadOnly) return;
  if (adapter.write !== undefined) return;
  throw new UiStoreConfigurationError(
    `Writable store adapter has no write method: ${definition.id}.`
  );
}

function writableBindings(
  document: UnifoldIrDocument
): Readonly<Record<string, UiRuntimeStoreBinding>> {
  const entries = Object.values(document.nodesById).flatMap((node) => {
    const binding = node.binding;
    if (binding === undefined) return [];
    const definition = requireDefinition(document, binding.store);
    if (definition.access !== UiStoreAccess.ReadWriteDraft) return [];
    return [[node.id, { path: binding.path, storeId: binding.store }] as const];
  });
  return Object.fromEntries(entries);
}

function requireDefinition(document: UnifoldIrDocument, id: string): UiStoreDefinition {
  const definition = ownValue(document.storesById, id);
  if (definition !== undefined) return definition;
  throw new UiStoreConfigurationError(`Compiled store is missing: ${id}.`);
}

function withStorePolicy(snapshot: UiNodeSnapshot, definition: UiStoreDefinition): UiNodeSnapshot {
  const readOnly = definition.access === UiStoreAccess.ReadOnly;
  return {
    ...snapshot,
    base: {
      ...snapshot.base,
      dataClassification: definition.classification,
      disabled: snapshot.base.disabled || readOnly,
      readonly: snapshot.base.readonly || readOnly
    }
  };
}

function withStoreValue(snapshot: UiNodeSnapshot, value: JsonValue): UiNodeSnapshot {
  const properties = { ...snapshot.properties, value };
  const control = snapshot.control;
  if (control === undefined) return { ...snapshot, properties };
  return {
    ...snapshot,
    control: { ...control, initialValue: value, rawValue: value, value },
    properties
  };
}

function hydrateStoreValue(snapshot: UiNodeSnapshot, value: JsonValue | undefined): UiNodeSnapshot {
  return value === undefined ? snapshot : withStoreValue(snapshot, value);
}

const missingPath = Symbol("missing-store-path");

function ownStoreValue(value: JsonValue, path: string): JsonValue | undefined {
  let current: JsonValue | typeof missingPath = value;
  for (const key of split(path)) {
    current = ownChild(current, key);
    if (current === missingPath) return undefined;
  }
  return current;
}

function ownChild(value: JsonValue | typeof missingPath, key: string) {
  if (!isObjectValue(value)) return missingPath;
  if (!Object.hasOwn(value, key)) return missingPath;
  return Reflect.get(value, key) as JsonValue;
}

function isObjectValue(value: JsonValue | typeof missingPath): value is JsonArray | JsonObject {
  return typeof value === "object" && value !== null;
}

const JSON_POINTER = /^(?:\/(?:[^~/]|~[01])*)*$/u;
const ARRAY_INDEX = /^(?:0|[1-9][0-9]*)$/u;
const unsafePointerKeys = new Set(["__proto__", "constructor", "prototype"]);

type MutableJsonContainer = JsonValue[] | Record<string, JsonValue>;

export function safeStoreWrite(
  current: JsonValue | undefined,
  path: string,
  next: JsonValue
): JsonValue {
  const keys = safePointerKeys(path);
  if (keys.length === 0) return structuredClone(next);
  const root = writableRoot(current, keys[0] ?? "");
  writeNestedValue(root, keys, structuredClone(next));
  return root;
}

function safePointerKeys(path: string): readonly string[] {
  if (!validPointerPath(path)) throw storeWriteError();
  const keys = split(path);
  if (keys.some((key) => unsafePointerKeys.has(key))) throw storeWriteError();
  return keys;
}

function validPointerPath(path: string): boolean {
  return path.length <= 2048 && JSON_POINTER.test(path);
}

function writableRoot(current: JsonValue | undefined, firstKey: string): MutableJsonContainer {
  if (current === undefined) return newContainer(firstKey);
  if (!isObjectValue(current)) throw storeWriteError();
  return structuredClone(current) as MutableJsonContainer;
}

function writeNestedValue(
  root: MutableJsonContainer,
  keys: readonly string[],
  value: JsonValue
): void {
  let current = root;
  keys.slice(0, -1).forEach((key, index) => {
    current = writableChild(current, key, keys[index + 1] ?? "");
  });
  setOwnValue(current, keys.at(-1) ?? "", value);
}

function writableChild(
  current: MutableJsonContainer,
  key: string,
  nextKey: string
): MutableJsonContainer {
  assertContainerKey(current, key);
  if (!Object.hasOwn(current, key)) return addContainer(current, key, nextKey);
  const value = Reflect.get(current, key) as JsonValue;
  if (!isObjectValue(value)) throw storeWriteError();
  return value as MutableJsonContainer;
}

function addContainer(
  current: MutableJsonContainer,
  key: string,
  nextKey: string
): MutableJsonContainer {
  const child = newContainer(nextKey);
  Reflect.set(current, key, child);
  return child;
}

function newContainer(key: string): MutableJsonContainer {
  return ARRAY_INDEX.test(key) ? [] : (Object.create(null) as Record<string, JsonValue>);
}

function setOwnValue(current: MutableJsonContainer, key: string, value: JsonValue): void {
  assertContainerKey(current, key);
  Reflect.set(current, key, value);
}

function assertContainerKey(current: MutableJsonContainer, key: string): void {
  if (!Array.isArray(current)) return;
  assertArrayKey(current, key);
}

function assertArrayKey(current: JsonValue[], key: string): void {
  if (!ARRAY_INDEX.test(key)) throw storeWriteError();
  if (Number(key) > current.length) throw storeWriteError();
}

function ownValue<T>(values: Readonly<Record<string, T>>, id: string): T | undefined {
  return Object.hasOwn(values, id) ? values[id] : undefined;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  if (value === null) return false;
  if (!thenableTypes.has(typeof value)) return false;
  return typeof Reflect.get(value as object, "then") === "function";
}

const thenableTypes = new Set(["function", "object"]);

export function assertSynchronous(value: unknown): void {
  if (!isThenable(value)) return;
  void Promise.resolve(value).catch(() => undefined);
  throw new Error("Asynchronous stores are unsupported.");
}

function storeWriteError(): UiStoreConfigurationError {
  return new UiStoreConfigurationError("Store write is invalid.");
}
