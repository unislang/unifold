import type { JsonValue } from "@unislang/unifold-contracts";
import {
  UiCommandType,
  type StoreWriteCommand,
  type UiCommand,
  type UiNodeSnapshot
} from "@unislang/unifold-events";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import {
  type UiCommandPort,
  type UiExecutionContext,
  type UnifoldRuntime
} from "@unislang/unifold-runtime";

import { createApplicationSnapshots } from "./application-snapshots.js";
import type {
  UiAsyncStoreCommitResult,
  UiAsyncStoreEvent,
  UiAsyncStoreSession,
  UiAsyncStoreSnapshot
} from "./async-store-types.js";
import { UiStoreConfigurationError, type PreparedApplicationStores } from "./store-adapters.js";
import { authorizedStoreDefinition, type StoreCommandController } from "./store-command-port.js";

type UiAsyncStoreSessionRegistry = Readonly<Record<string, UiAsyncStoreSession>>;
type ControlledSnapshot = UiNodeSnapshot & {
  readonly control: NonNullable<UiNodeSnapshot["control"]>;
};

export class AsyncStoreCommandController implements StoreCommandController {
  readonly #abort = new AbortController();
  readonly #fallback: UiCommandPort | undefined;
  readonly #queues = new Map<string, Promise<void>>();
  readonly #sessions: UiAsyncStoreSessionRegistry;
  readonly #subscriptions: (() => void)[] = [];
  #disposed = false;
  #document: UnifoldIrDocument;
  #runtime: UnifoldRuntime | undefined;
  #stores: PreparedApplicationStores;

  constructor(
    document: UnifoldIrDocument,
    stores: PreparedApplicationStores,
    sessions: UiAsyncStoreSessionRegistry,
    fallback?: UiCommandPort
  ) {
    this.#document = document;
    this.#stores = stores;
    this.#sessions = sessions;
    this.#fallback = fallback;
  }

  execute(command: UiCommand, context: Required<UiExecutionContext>): Promise<void> | void {
    if (command.type !== UiCommandType.StoreWrite) return this.#fallback?.execute(command, context);
    authorizedStoreDefinition(command, this.#document);
    return this.#enqueue(command.storeId, () => this.#commit(command, context));
  }

  replace(document: UnifoldIrDocument, stores: PreparedApplicationStores): void {
    this.#document = document;
    this.#stores = stores;
  }

  attach(runtime: UnifoldRuntime): void {
    if (this.#disposed) throw new UiStoreConfigurationError("Async store controller is disposed.");
    if (this.#runtime !== undefined) return;
    this.#runtime = runtime;
    Object.entries(this.#sessions).forEach(([id, session]) => this.#subscribe(id, session));
    Object.entries(this.#sessions).forEach(([id, session]) => this.#project(id, session.snapshot));
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#abort.abort();
    this.#subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
    Object.values(this.#sessions).forEach((session) => session.dispose());
    this.#runtime = undefined;
  }

  #subscribe(id: string, session: UiAsyncStoreSession): void {
    this.#subscriptions.push(
      session.subscribe((event) => {
        if (externalUpdate(event)) this.#enqueueProjection(id, event);
      })
    );
  }

  #enqueueProjection(id: string, event: UiAsyncStoreEvent): void {
    if (!externalUpdate(event)) return;
    void this.#enqueue(id, () => this.#project(id, event.snapshot)).catch(() => undefined);
  }

  #enqueue(id: string, operation: () => Promise<void> | void): Promise<void> {
    const previous = this.#queues.get(id) ?? Promise.resolve();
    const current = previous.then(() => operation());
    const settled = current.then(
      () => undefined,
      () => undefined
    );
    this.#queues.set(id, settled);
    void settled.then(() => this.#releaseQueue(id, settled));
    return current;
  }

  #releaseQueue(id: string, settled: Promise<void>): void {
    if (this.#queues.get(id) === settled) this.#queues.delete(id);
  }

  async #commit(command: StoreWriteCommand, context: Required<UiExecutionContext>): Promise<void> {
    assertControllerActive(this.#disposed);
    const session = requireSession(this.#sessions, command.storeId);
    const result = await session.commit({
      expectedRevision: expectedStoreRevision(session),
      idempotencyKey: commitIdentity(context.transactionId, command.id),
      path: command.path,
      signal: this.#abort.signal,
      value: structuredClone(command.value)
    });
    const accepted = acceptedSnapshot(result);
    if (accepted instanceof Error) {
      this.#project(command.storeId, session.snapshot);
      throw accepted;
    }
    Reflect.set(this.#stores.values, command.storeId, structuredClone(accepted.value));
  }

  #project(id: string, snapshot: UiAsyncStoreSession["snapshot"]): void {
    if (!this.#acceptStoreSnapshot(id, snapshot)) return;
    this.#projectRuntime(id, snapshot);
  }

  #acceptStoreSnapshot(
    id: string,
    snapshot: UiAsyncStoreSession["snapshot"]
  ): snapshot is UiAsyncStoreSnapshot {
    if (this.#disposed) return false;
    if (snapshot === undefined) return false;
    Reflect.set(this.#stores.values, id, structuredClone(snapshot.value));
    return true;
  }

  #projectRuntime(id: string, snapshot: UiAsyncStoreSnapshot): void {
    const runtime = this.#runtime;
    if (runtime === undefined) return;
    const commands = projectionCommands(id, this.#document, this.#stores, runtime);
    if (commands.length === 0) return;
    runtime.execute(commands, {
      suppressedStoreWriteIds: [id],
      transactionId: externalIdentity(id, snapshot.revision)
    });
  }
}

function projectionCommands(
  storeId: string,
  document: UnifoldIrDocument,
  stores: PreparedApplicationStores,
  runtime: UnifoldRuntime
): UiCommand[] {
  return createApplicationSnapshots(document, runtime.revision, stores)
    .filter((snapshot) => document.nodesById[snapshot.id]?.binding?.store === storeId)
    .filter(hasControl)
    .filter((snapshot) => changedControlValue(runtime, snapshot))
    .map((snapshot) => ({
      id: snapshot.id,
      type: UiCommandType.ControlSetValue,
      value: snapshot.control.value
    }));
}

function hasControl(snapshot: UiNodeSnapshot): snapshot is ControlledSnapshot {
  return snapshot.control !== undefined;
}

function changedControlValue(runtime: UnifoldRuntime, snapshot: ControlledSnapshot): boolean {
  return !sameJson(runtime.getSnapshot(snapshot.id).control?.value, snapshot.control.value);
}

function externalUpdate(
  event: UiAsyncStoreEvent
): event is Extract<UiAsyncStoreEvent, { status: "updated" }> {
  return event.status === "updated" && event.source === "external";
}

function requireSession(sessions: UiAsyncStoreSessionRegistry, id: string): UiAsyncStoreSession {
  const session = Object.hasOwn(sessions, id) ? sessions[id] : undefined;
  if (session === undefined) throw storeCommitError("store-session-missing");
  return session;
}

function expectedStoreRevision(session: UiAsyncStoreSession): string | null {
  return session.snapshot?.revision ?? null;
}

function acceptedSnapshot(result: UiAsyncStoreCommitResult): UiAsyncStoreSnapshot | Error {
  if (result.status !== "committed") return rejectedCommit(result);
  if (result.snapshot === undefined) return rejectedCommit(result);
  return result.snapshot;
}

function rejectedCommit(result: UiAsyncStoreCommitResult): Error {
  return storeCommitError(result.code ?? `store-commit-${result.status}`);
}

function assertControllerActive(disposed: boolean): void {
  if (disposed) throw storeCommitError("store-controller-disposed");
}

function commitIdentity(transactionId: string, nodeId: string): string {
  return visibleIdentity(`${transactionId}:${nodeId}`);
}

function externalIdentity(storeId: string, revision: string): string {
  return visibleIdentity(`store-external:${storeId}:${revision}`);
}

function visibleIdentity(value: string): string {
  return [...value]
    .map((character) => (visibleCharacter(character) ? character : "_"))
    .join("")
    .slice(0, 256);
}

function visibleCharacter(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  return code > 31 && code !== 127;
}

function sameJson(left: unknown, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function storeCommitError(code: string): UiStoreConfigurationError {
  return new UiStoreConfigurationError(`Async store commit failed: ${code}.`);
}
