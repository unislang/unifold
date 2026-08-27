import type { UiCompositionInstanceManifest } from "@unislang/unifold-contracts";
import type { UiCommand, UiTransactionRecord } from "@unislang/unifold-events";
import type { NormalizedNodeStore } from "@unislang/unifold-reactivity";
import type { CompiledRuleProgram } from "@unislang/unifold-rules";
import type { UiActorRef } from "@unislang/unifold-xstate";

import type { UiCommandEffect } from "./effect-runner.js";
import type { RuntimePublisherCoordination } from "./runtime-publication-coordination.js";
import type { RuntimePublisher } from "./runtime-publisher.js";
import type {
  UiResolvedRuntimeExecutionContext,
  UiRuntimeExecutionContext,
  UiRuntimeStoreBinding,
  UnifoldRuntimeCoordination
} from "./types.js";

interface CoordinationBoundary {
  commit(): void;
  discard(): void;
}

type ActorCheckpoint = CoordinationBoundary;

export interface DeferredRuntimeWork {
  readonly commands: readonly UiCommand[];
  readonly context: UiResolvedRuntimeExecutionContext;
  readonly effects: readonly UiCommandEffect[];
  readonly record: UiTransactionRecord;
  readonly removedIds: readonly string[];
}

interface StagedActor {
  readonly actor: UiActorRef;
  readonly id: string;
  active: boolean;
  unregister?: () => void;
}

interface RuntimeCoordinationOptions {
  readonly actors: ActorCheckpoint;
  readonly discardAuthorities: () => void;
  readonly execute: (
    coordination: RuntimeCoordination,
    commands: readonly UiCommand[],
    context: UiRuntimeExecutionContext
  ) => UiTransactionRecord;
  readonly finish: (coordination: RuntimeCoordination) => void;
  readonly installActor: (id: string, actor: UiActorRef) => () => void;
  readonly publish: RuntimePublisherCoordination;
  readonly remove: (ids: readonly string[]) => void;
  readonly runEffects: (work: DeferredRuntimeWork) => void;
  readonly store: CoordinationBoundary;
  readonly validate: (work: DeferredRuntimeWork) => void;
}

export class RuntimeCoordination implements UnifoldRuntimeCoordination {
  readonly #actors: StagedActor[] = [];
  readonly #work: DeferredRuntimeWork[] = [];
  #open = true;

  constructor(private readonly options: RuntimeCoordinationOptions) {}

  execute(
    commands: readonly UiCommand[],
    context: UiRuntimeExecutionContext = {}
  ): UiTransactionRecord {
    this.assertOpen();
    return this.options.execute(this, commands, context);
  }

  registerActor(id: string, actor: UiActorRef): () => void {
    this.assertOpen();
    const staged: StagedActor = { active: true, actor, id };
    this.#actors.push(staged);
    return () => this.cancelActor(staged);
  }

  defer(work: DeferredRuntimeWork): void {
    this.assertOpen();
    this.#work.push(work);
  }

  commit(): void {
    this.assertOpen();
    this.options.publish.prepare();
    this.prepareActors();
    try {
      this.options.store.commit();
    } catch (error) {
      this.uninstallActors();
      throw error;
    }
    this.options.actors.commit();
    this.finish();
    this.options.publish.commit();
    this.settleDeferredWork();
  }

  discard(): void {
    this.assertOpen();
    this.options.store.discard();
    this.options.publish.discard();
    this.options.discardAuthorities();
    this.options.actors.discard();
    this.finish();
  }

  private cancelActor(staged: StagedActor): void {
    staged.active = false;
    staged.unregister?.();
  }

  private installActors(): void {
    try {
      this.#actors
        .filter(({ active }) => active)
        .forEach((staged) => {
          staged.unregister = this.options.installActor(staged.id, staged.actor);
        });
    } catch (error) {
      this.uninstallActors();
      throw error;
    }
  }

  private prepareActors(): void {
    this.options.remove(this.removedIds());
    this.installActors();
  }

  private uninstallActors(): void {
    this.#actors.forEach((staged) => this.cancelActor(staged));
  }

  private removedIds(): readonly string[] {
    return [...new Set(this.#work.flatMap(({ removedIds }) => removedIds))];
  }

  private settleDeferredWork(): void {
    this.#work.forEach((work) => safelyRun(() => this.options.runEffects(work)));
    this.#work.forEach((work) => safelyRun(() => this.options.validate(work)));
  }

  private finish(): void {
    this.#open = false;
    this.options.finish(this);
  }

  private assertOpen(): void {
    if (!this.#open) throw new Error("Runtime coordination is closed.");
  }
}

function safelyRun(work: () => void): void {
  try {
    work();
  } catch {
    // Deferred post-commit adapters cannot reverse an already published transaction.
  }
}

export interface RuntimeAuthorityCheckpoint {
  readonly compositionInstances: Readonly<Record<string, UiCompositionInstanceManifest>>;
  readonly rules: CompiledRuleProgram | undefined;
  readonly storeBindings: Readonly<Record<string, UiRuntimeStoreBinding>>;
}

interface RuntimeCoordinationManagerOptions {
  readonly captureActors: () => ActorCheckpoint;
  readonly captureAuthorities: () => RuntimeAuthorityCheckpoint;
  readonly execute: (
    commands: readonly UiCommand[],
    context: UiRuntimeExecutionContext
  ) => UiTransactionRecord;
  readonly installActor: (id: string, actor: UiActorRef) => () => void;
  readonly publisher: RuntimePublisher;
  readonly remove: (ids: readonly string[]) => void;
  readonly restoreAuthorities: (checkpoint: RuntimeAuthorityCheckpoint) => void;
  readonly runEffects: (work: DeferredRuntimeWork) => void;
  readonly store: NormalizedNodeStore;
  readonly validate: (work: DeferredRuntimeWork) => void;
}

export class RuntimeCoordinationManager {
  #current: RuntimeCoordination | undefined;

  constructor(private readonly options: RuntimeCoordinationManagerOptions) {}

  get active(): boolean {
    return this.#current !== undefined;
  }

  begin(): UnifoldRuntimeCoordination {
    this.assertAvailable();
    const checkpoint = this.options.captureAuthorities();
    const publish = this.options.publisher.beginCoordination();
    const store = openStoreCoordination(this.options.store, publish);
    const actors = captureActorCheckpoint(this.options.captureActors, store, publish);
    const coordination = new RuntimeCoordination({
      actors,
      discardAuthorities: () => this.options.restoreAuthorities(checkpoint),
      execute: (owner, commands, context) => this.execute(owner, commands, context),
      finish: (owner) => this.finish(owner),
      installActor: this.options.installActor,
      publish,
      remove: this.options.remove,
      runEffects: this.options.runEffects,
      store,
      validate: this.options.validate
    });
    this.#current = coordination;
    return coordination;
  }

  defer(work: DeferredRuntimeWork): boolean {
    if (this.#current === undefined) return false;
    this.#current.defer(work);
    return true;
  }

  settle(work: DeferredRuntimeWork): void {
    if (this.defer(work)) return;
    this.options.runEffects(work);
    this.options.validate(work);
  }

  discardActive(): void {
    this.#current?.discard();
  }

  assertAvailable(): void {
    if (this.#current !== undefined) throw new Error("The Unifold runtime is coordinated.");
  }

  private execute(
    owner: RuntimeCoordination,
    commands: readonly UiCommand[],
    context: UiRuntimeExecutionContext
  ): UiTransactionRecord {
    this.require(owner);
    return this.options.execute(commands, context);
  }

  private finish(owner: RuntimeCoordination): void {
    this.require(owner);
    this.#current = undefined;
  }

  private require(owner: RuntimeCoordination): void {
    if (this.#current !== owner) throw new Error("Runtime coordination is unavailable.");
  }
}

function openStoreCoordination(
  store: NormalizedNodeStore,
  publish: RuntimePublisherCoordination
): CoordinationBoundary {
  try {
    return store.beginCoordination();
  } catch (error) {
    publish.discard();
    throw error;
  }
}

function captureActorCheckpoint(
  capture: () => ActorCheckpoint,
  store: CoordinationBoundary,
  publish: RuntimePublisherCoordination
): ActorCheckpoint {
  try {
    return capture();
  } catch (error) {
    store.discard();
    publish.discard();
    throw error;
  }
}
