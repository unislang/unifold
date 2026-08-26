import type {
  UiAsyncStoreAdapter,
  UiAsyncStoreAdapterCommitCommand,
  UiAsyncStoreCommitResult,
  UiAsyncStoreSnapshot
} from "./async-store-types.js";

const envelopeSchemaVersion = "1.0.0";
const defaultMaximumBytes = 10 * 1024 * 1024;

export interface UiAsyncKeyValueCompareAndSetRequest {
  readonly expectedRevision: string | null;
  readonly idempotencyKey: string;
  readonly key: string;
  readonly signal?: AbortSignal;
  readonly value: string;
}

export interface UiAsyncKeyValueCompareAndSetResult {
  readonly status: "committed" | "conflict";
}

export interface UiAsyncKeyValueStorePort {
  compareAndSet(
    request: UiAsyncKeyValueCompareAndSetRequest
  ): Promise<UiAsyncKeyValueCompareAndSetResult>;
  read(key: string, signal?: AbortSignal): Promise<string | null>;
  subscribe?(key: string, listener: (value: string) => void): () => void;
}

export interface UiAsyncKeyValueStoreOptions {
  readonly createRevision: (expectedRevision: string | null, idempotencyKey: string) => string;
  readonly key: string;
  readonly maximumBytes?: number;
}

export function createAsyncKeyValueStoreAdapter(
  port: UiAsyncKeyValueStorePort,
  version: string,
  options: UiAsyncKeyValueStoreOptions
): UiAsyncStoreAdapter {
  assertConfiguration(version, options);
  const maximumBytes = options.maximumBytes ?? defaultMaximumBytes;
  const adapter: UiAsyncStoreAdapter = {
    commit: (command) => commitKeyValue(port, version, options, maximumBytes, command),
    load: (signal) => loadKeyValue(port, options.key, maximumBytes, signal),
    version
  };
  return withOptionalSubscription(adapter, port, options.key, maximumBytes);
}

async function commitKeyValue(
  port: UiAsyncKeyValueStorePort,
  version: string,
  options: UiAsyncKeyValueStoreOptions,
  maximumBytes: number,
  command: UiAsyncStoreAdapterCommitCommand
): Promise<UiAsyncStoreCommitResult> {
  try {
    return await commitAvailable(port, version, options, maximumBytes, command);
  } catch {
    return failedCommit(command.signal);
  }
}

async function commitAvailable(
  port: UiAsyncKeyValueStorePort,
  version: string,
  options: UiAsyncKeyValueStoreOptions,
  maximumBytes: number,
  command: UiAsyncStoreAdapterCommitCommand
): Promise<UiAsyncStoreCommitResult> {
  const cancellation = cancelledCommit(command.signal);
  if (cancellation !== undefined) return cancellation;
  const snapshot = proposedSnapshot(command, version, options.createRevision);
  const value = encodeSnapshot(snapshot, maximumBytes);
  const result = await port.compareAndSet(compareRequest(command, options.key, value));
  return completedCommit(command.signal, result, snapshot);
}

function proposedSnapshot(
  command: UiAsyncStoreAdapterCommitCommand,
  version: string,
  createRevision: UiAsyncKeyValueStoreOptions["createRevision"]
): UiAsyncStoreSnapshot {
  assertDataVersion(command.dataVersion, version);
  const revision = requireNextRevision(
    createRevision(command.expectedRevision, command.idempotencyKey),
    command.expectedRevision
  );
  return { dataVersion: version, revision, value: structuredClone(command.candidate) };
}

function assertDataVersion(actual: string, expected: string): void {
  if (actual !== expected) throw new Error("Data version is invalid.");
}

function requireNextRevision(revision: string, previousRevision: string | null): string {
  if (!validIdentity(revision)) throw new Error("Revision is invalid.");
  if (revision === previousRevision) throw new Error("Revision did not advance.");
  return revision;
}

function compareRequest(
  command: UiAsyncStoreAdapterCommitCommand,
  key: string,
  value: string
): UiAsyncKeyValueCompareAndSetRequest {
  return {
    expectedRevision: command.expectedRevision,
    idempotencyKey: command.idempotencyKey,
    key,
    ...(command.signal === undefined ? {} : { signal: command.signal }),
    value
  };
}

function completedCommit(
  signal: AbortSignal | undefined,
  result: UiAsyncKeyValueCompareAndSetResult,
  snapshot: UiAsyncStoreSnapshot
): UiAsyncStoreCommitResult {
  const cancellation = cancelledCommit(signal);
  if (cancellation !== undefined) return cancellation;
  return providerCommitResult(result.status, snapshot);
}

function providerCommitResult(
  status: UiAsyncKeyValueCompareAndSetResult["status"],
  snapshot: UiAsyncStoreSnapshot
): UiAsyncStoreCommitResult {
  return status === "committed"
    ? { snapshot: structuredClone(snapshot), status: "committed" }
    : { status: "conflict" };
}

function cancelledCommit(signal?: AbortSignal): UiAsyncStoreCommitResult | undefined {
  return signal?.aborted === true ? { status: "cancelled" } : undefined;
}

function failedCommit(signal?: AbortSignal): UiAsyncStoreCommitResult {
  return cancelledCommit(signal) ?? { status: "unavailable" };
}

async function loadKeyValue(
  port: UiAsyncKeyValueStorePort,
  key: string,
  maximumBytes: number,
  signal?: AbortSignal
): Promise<UiAsyncStoreSnapshot | undefined> {
  const encoded = await port.read(key, signal);
  return encoded === null ? undefined : decodeSnapshot(encoded, maximumBytes);
}

function withOptionalSubscription(
  adapter: UiAsyncStoreAdapter,
  port: UiAsyncKeyValueStorePort,
  key: string,
  maximumBytes: number
): UiAsyncStoreAdapter {
  if (port.subscribe === undefined) return adapter;
  const subscribe = port.subscribe.bind(port);
  return {
    ...adapter,
    subscribe: (listener) =>
      subscribe(key, (encoded) => notifyDecoded(listener, encoded, maximumBytes))
  };
}

function notifyDecoded(
  listener: (snapshot: UiAsyncStoreSnapshot) => void,
  encoded: string,
  maximumBytes: number
): void {
  try {
    listener(decodeSnapshot(encoded, maximumBytes));
  } catch {
    // Corrupt external notifications cannot enter the session.
  }
}

function encodeSnapshot(snapshot: UiAsyncStoreSnapshot, maximumBytes: number): string {
  const encoded = JSON.stringify({ schemaVersion: envelopeSchemaVersion, ...snapshot });
  assertEncodedSize(encoded, maximumBytes);
  return encoded;
}

function decodeSnapshot(encoded: string, maximumBytes: number): UiAsyncStoreSnapshot {
  assertEncodedSize(encoded, maximumBytes);
  return requireEnvelope(JSON.parse(encoded) as unknown);
}

function requireEnvelope(value: unknown): UiAsyncStoreSnapshot {
  const envelope = requireRecord(value);
  assertEnvelopeSchema(envelope);
  const dataVersion = requireIdentityValue(envelope["dataVersion"], "Data version");
  const revision = requireIdentityValue(envelope["revision"], "Revision");
  assertEnvelopeValue(envelope);
  return {
    dataVersion,
    revision,
    value: structuredClone(envelope["value"]) as UiAsyncStoreSnapshot["value"]
  };
}

function requireRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) throw new Error("Store envelope is invalid.");
  return value;
}

function assertEnvelopeSchema(value: Readonly<Record<string, unknown>>): void {
  if (value["schemaVersion"] !== envelopeSchemaVersion) {
    throw new Error("Schema version is invalid.");
  }
}

function requireIdentityValue(value: unknown, label: string): string {
  if (!validIdentityValue(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function assertEnvelopeValue(value: Readonly<Record<string, unknown>>): void {
  if (!Object.hasOwn(value, "value")) throw new Error("Store value is missing.");
}

function assertConfiguration(version: string, options: UiAsyncKeyValueStoreOptions): void {
  if (!validIdentity(version)) throw new Error("Async key/value store version is invalid.");
  if (!validIdentity(options.key)) throw new Error("Async key/value store key is invalid.");
  assertMaximumBytes(configuredMaximumBytes(options.maximumBytes));
}

function configuredMaximumBytes(value: number | undefined): number {
  return value ?? defaultMaximumBytes;
}

function assertMaximumBytes(value: number): void {
  const valid = [Number.isInteger(value), value >= 1, value <= defaultMaximumBytes];
  if (!valid.every(Boolean)) throw new Error("Async key/value store byte limit is invalid.");
}

function assertEncodedSize(value: string, maximumBytes: number): void {
  if (new TextEncoder().encode(value).byteLength > maximumBytes) {
    throw new Error("Async key/value store envelope is too large.");
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object") return false;
  if (value === null) return false;
  return !Array.isArray(value);
}

function validIdentityValue(value: unknown): value is string {
  return typeof value === "string" && validIdentity(value);
}

function validIdentity(value: string): boolean {
  const characters = [...value];
  return [
    characters.length > 0,
    characters.length <= 256,
    characters.every(visibleCharacter)
  ].every(Boolean);
}

function visibleCharacter(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  return code > 31 && code !== 127;
}
