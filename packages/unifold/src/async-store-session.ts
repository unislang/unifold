import type { JsonValue, UiStoreDefinition } from "@unislang/unifold-contracts";
import { validateStoreInput } from "@unislang/unifold-ir";

import type {
  UiAsyncStoreAdapter,
  UiAsyncStoreCommitCommand,
  UiAsyncStoreCommitResult,
  UiAsyncStoreConnectionOptions,
  UiAsyncStoreEvent,
  UiAsyncStoreSession,
  UiAsyncStoreSnapshot,
  UiStoreExternalConflictPolicy
} from "./async-store-types.js";
import {
  authorizedStoreOperation,
  adapterCommit,
  cancelledCommitRejection,
  cloneSnapshot,
  commitFailure,
  disposedCommitRejection,
  firstDefinedCommitResult,
  invalidIdentityCommitRejection,
  isAborted,
  optionalSnapshotValue,
  revisionCommitRejection,
  sameRevision,
  sanitizeAdapterCommitResult,
  validCandidate,
  validatedSnapshot
} from "./async-store-session-helpers.js";
import { safeStoreWrite } from "./store-adapters.js";

const defaultConflictPolicy: UiStoreExternalConflictPolicy = "reject-concurrent";

export function createAsyncStoreSession(
  definition: UiStoreDefinition,
  adapter: UiAsyncStoreAdapter,
  options: UiAsyncStoreConnectionOptions,
  snapshot: UiAsyncStoreSnapshot | undefined
): UiAsyncStoreSession {
  const session = new AsyncStoreSession(definition, adapter, options, snapshot);
  session.start();
  return session;
}

class AsyncStoreSession implements UiAsyncStoreSession {
  readonly #adapter: UiAsyncStoreAdapter;
  readonly #conflictPolicy: UiStoreExternalConflictPolicy;
  readonly #listeners = new Set<(event: UiAsyncStoreEvent) => void>();
  readonly #options: UiAsyncStoreConnectionOptions;
  #committing = false;
  #disposed = false;
  #queuedExternal: UiAsyncStoreSnapshot | undefined;
  #snapshot: UiAsyncStoreSnapshot | undefined;
  #unsubscribe: (() => void) | undefined;
  readonly definition: UiStoreDefinition;

  constructor(
    definition: UiStoreDefinition,
    adapter: UiAsyncStoreAdapter,
    options: UiAsyncStoreConnectionOptions,
    snapshot: UiAsyncStoreSnapshot | undefined
  ) {
    this.definition = definition;
    this.#adapter = adapter;
    this.#options = options;
    this.#conflictPolicy = options.conflictPolicy ?? defaultConflictPolicy;
    this.#snapshot = cloneSnapshot(snapshot);
  }

  get snapshot(): UiAsyncStoreSnapshot | undefined {
    return cloneSnapshot(this.#snapshot);
  }

  start(): void {
    this.#unsubscribe = this.#adapter.subscribe?.((snapshot) => this.#external(snapshot));
  }

  async commit(command: UiAsyncStoreCommitCommand): Promise<UiAsyncStoreCommitResult> {
    if (this.#committing) return commitFailure("conflict", "store-commit-in-flight");
    this.#committing = true;
    try {
      return await this.#performCommit(command);
    } finally {
      this.#committing = false;
      this.#applyQueuedExternal();
    }
  }

  async #performCommit(command: UiAsyncStoreCommitCommand): Promise<UiAsyncStoreCommitResult> {
    const rejected = await this.#commitRejection(command);
    if (rejected !== undefined) return rejected;
    const candidate = this.#candidate(command);
    if (candidate === undefined) return commitFailure("invalid", "store-candidate-invalid");
    return this.#acceptCommit(
      await this.#invokeCommit(command, candidate),
      command.expectedRevision
    );
  }

  subscribe(listener: (event: UiAsyncStoreEvent) => void): () => void {
    if (this.#disposed) return () => undefined;
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#unsubscribe?.();
    this.#listeners.clear();
    this.#queuedExternal = undefined;
  }

  async #commitRejection(
    command: UiAsyncStoreCommitCommand
  ): Promise<UiAsyncStoreCommitResult | undefined> {
    const rejection = firstDefinedCommitResult([
      disposedCommitRejection(this.#disposed),
      cancelledCommitRejection(command.signal),
      invalidIdentityCommitRejection(command),
      revisionCommitRejection(this.#snapshot, command.expectedRevision)
    ]);
    if (rejection !== undefined) return rejection;
    const allowed = await authorizedStoreOperation(
      this.definition,
      this.#options,
      "commit",
      command.path
    );
    return allowed ? undefined : commitFailure("denied", "store-commit-denied");
  }

  #candidate(command: UiAsyncStoreCommitCommand): JsonValue | undefined {
    try {
      const candidate = safeStoreWrite(
        optionalSnapshotValue(this.#snapshot),
        command.path,
        command.value
      );
      const validation = validateStoreInput(this.definition, this.#adapter.version, candidate);
      return validCandidate(validation.status, candidate);
    } catch {
      return undefined;
    }
  }

  async #invokeCommit(
    command: UiAsyncStoreCommitCommand,
    candidate: JsonValue
  ): Promise<UiAsyncStoreCommitResult> {
    try {
      const result = await this.#adapter.commit(
        adapterCommit(command, candidate, this.#adapter.version)
      );
      if (isAborted(command.signal)) return commitFailure("cancelled", "store-cancelled");
      return sanitizeAdapterCommitResult(result);
    } catch {
      return commitFailure("unavailable", "store-commit-unavailable");
    }
  }

  #acceptCommit(
    result: UiAsyncStoreCommitResult,
    previousRevision: string | null
  ): UiAsyncStoreCommitResult {
    if (result.status !== "committed") return result;
    const snapshot = this.#newSnapshot(result.snapshot, previousRevision);
    if (snapshot === undefined) return commitFailure("invalid", "store-commit-result-invalid");
    this.#apply(snapshot, "commit");
    return { snapshot: structuredClone(snapshot), status: "committed" };
  }

  #external(snapshot: UiAsyncStoreSnapshot): void {
    if (this.#disposed) return;
    if (this.#committing) {
      this.#concurrentExternal(snapshot);
      return;
    }
    this.#applyExternal(snapshot);
  }

  #concurrentExternal(snapshot: UiAsyncStoreSnapshot): void {
    this.#queuedExternal = cloneSnapshot(snapshot);
  }

  #applyQueuedExternal(): void {
    const queued = this.#queuedExternal;
    this.#queuedExternal = undefined;
    if (queued === undefined) return;
    this.#resolveConcurrentExternal(queued);
  }

  #resolveConcurrentExternal(value: UiAsyncStoreSnapshot): void {
    const snapshot = this.#validated(value);
    if (snapshot === undefined) {
      this.#emit({ code: "store-external-invalid", status: "rejected" });
      return;
    }
    this.#applyValidConcurrent(snapshot);
  }

  #applyValidConcurrent(snapshot: UiAsyncStoreSnapshot): void {
    if (this.#conflictPolicy === "external-wins") {
      this.#applyExternal(snapshot);
      return;
    }
    if (sameRevision(snapshot, this.#snapshot)) return;
    this.#emit({ code: "store-concurrent-update", status: "conflict" });
  }

  #applyExternal(value: UiAsyncStoreSnapshot): void {
    const snapshot = this.#validated(value);
    if (snapshot === undefined) {
      this.#emit({ code: "store-external-invalid", status: "rejected" });
      return;
    }
    if (sameRevision(snapshot, this.#snapshot)) return;
    this.#apply(snapshot, "external");
  }

  #validated(value: UiAsyncStoreSnapshot | undefined): UiAsyncStoreSnapshot | undefined {
    const result = validatedSnapshot(this.definition, this.#adapter.version, value, this.#options);
    return result instanceof Error ? undefined : result;
  }

  #newSnapshot(
    value: UiAsyncStoreSnapshot | undefined,
    previousRevision: string | null
  ): UiAsyncStoreSnapshot | undefined {
    const snapshot = this.#validated(value);
    return snapshot?.revision === previousRevision ? undefined : snapshot;
  }

  #apply(snapshot: UiAsyncStoreSnapshot, source: "commit" | "external"): void {
    this.#snapshot = cloneSnapshot(snapshot);
    this.#emit({ snapshot: structuredClone(snapshot), source, status: "updated" });
  }

  #emit(event: UiAsyncStoreEvent): void {
    this.#listeners.forEach((listener) => {
      try {
        listener(structuredClone(event));
      } catch {
        // Consumers cannot interrupt store state transitions.
      }
    });
  }
}
