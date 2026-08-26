import type { JsonValue } from "@unislang/unifold-contracts";

import { assertSynchronous, safeStoreWrite, UiStoreConfigurationError } from "./store-adapters.js";
import type { UiStoreAdapter } from "./types.js";

export interface UiWebStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StoredEnvelope {
  readonly value: JsonValue;
  readonly version: string;
}

export function createWebStorageStoreAdapter(
  storage: UiWebStoragePort,
  key: string,
  version: string
): UiStoreAdapter {
  assertConfiguration(key, version);
  return {
    load: () => loadStorageValue(storage, key, version),
    version,
    write: (path, next) => writeStorageValue(storage, key, version, path, next)
  };
}

function loadStorageValue(
  storage: UiWebStoragePort,
  key: string,
  version: string
): JsonValue | undefined {
  try {
    return readEnvelope(storage, key, version)?.value;
  } catch {
    throw storageError("load");
  }
}

function writeStorageValue(
  storage: UiWebStoragePort,
  key: string,
  version: string,
  path: string,
  next: JsonValue
): void {
  try {
    const current = readEnvelope(storage, key, version)?.value;
    const value = safeStoreWrite(current, path, next);
    assertSynchronous(storage.setItem(key, JSON.stringify({ value, version })));
  } catch {
    throw storageError("write");
  }
}

function readEnvelope(
  storage: UiWebStoragePort,
  key: string,
  version: string
): StoredEnvelope | undefined {
  const encoded = storage.getItem(key);
  if (encoded === null) return undefined;
  return requireEnvelope(JSON.parse(encoded) as unknown, version);
}

function requireEnvelope(value: unknown, version: string): StoredEnvelope {
  const envelope = requireEnvelopeShape(value);
  if (envelope["version"] !== version) throw storageError("load");
  return { value: envelope["value"] as JsonValue, version };
}

function requireEnvelopeShape(value: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) throw storageError("load");
  if (!Object.hasOwn(value, "value")) throw storageError("load");
  return value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object") return false;
  if (value === null) return false;
  return !Array.isArray(value);
}

function assertConfiguration(key: string, version: string): void {
  if (key.length === 0) throw new UiStoreConfigurationError("Web Storage key is invalid.");
  if (version.length === 0) throw new UiStoreConfigurationError("Web Storage version is invalid.");
}

function storageError(operation: string): UiStoreConfigurationError {
  return new UiStoreConfigurationError(`Web Storage store failed to ${operation}.`);
}
