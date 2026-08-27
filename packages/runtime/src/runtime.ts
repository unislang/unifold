import {
  UiEventType,
  type UiCommand,
  type UiEvent,
  type UiNodeId,
  type UiNodeSnapshot,
  type UiTransactionRecord
} from "@unislang/unifold-events";
import type {
  JsonValue,
  UiCompositionInstanceManifest,
  UiDerivedRuleDefinition
} from "@unislang/unifold-contracts";
import { withValidatedControl, type UiValidatorRegistryPort } from "@unislang/unifold-forms";
import {
  createEventFabric,
  type UiEventFabricController,
  type NormalizedNodeStore,
  type UiSelection,
  type UiSelector
} from "@unislang/unifold-reactivity";
import { XStateEventRouter, type UiActorRef } from "@unislang/unifold-xstate";
import type { CompiledRuleProgram } from "@unislang/unifold-rules";
import type { Observable } from "rxjs";
import { isStateCommand } from "./command-handlers.js";
import {
  compileRuntimeDerivedRules,
  createRuntimeNodeStore,
  transactRuntimeCommands
} from "./derived-rules.js";
import { createCompositionHandle } from "./composition-handle.js";
import { createControlHandle } from "./control-handle.js";
import { acceptIntent } from "./intent-ingress.js";
import { createNodeHandle, createScopeHandle } from "./node-handle.js";
import { RuntimePublisher } from "./runtime-publisher.js";
import {
  RuntimeCoordinationManager,
  type RuntimeAuthorityCheckpoint
} from "./runtime-coordination.js";
import { UiRuntimeValidation } from "./runtime-validation.js";
import {
  initialCompositions,
  initialNodes,
  initialStoreBindings,
  asyncValidatorRegistry,
  resolveIdFactory,
  resolveNow,
  readRuntimeSnapshot,
  requireIntentSnapshot,
  resolveRuntimeExecutionContext,
  runtimeInspection,
  runtimeSource,
  unchangedRecord,
  validatorRegistry
} from "./runtime-helpers.js";
import { reconciledCompositionInstances, removedOwnerIds } from "./structure-reconciliation.js";
import { captureBoundValues, storeWriteEffects } from "./store-write.js";
import { runCommandEffects, type UiCommandEffect } from "./effect-runner.js";
import {
  UnifoldRuntimeStatus,
  type UiRuntimeExecutionContext,
  type UiResolvedRuntimeExecutionContext,
  type UiCompositionHandle,
  type UiNodeHandle,
  type UiRuntimeInspectionSnapshot,
  type UiControlHandle,
  type UiScopeHandle,
  type UnifoldRuntimeCoordination,
  type UnifoldRuntimeOptions
} from "./types.js";

export class UnifoldRuntime {
  readonly events$: Observable<UiEvent>;
  private readonly fabric: UiEventFabricController;
  private readonly store: NormalizedNodeStore;
  private readonly actors = new XStateEventRouter();
  private readonly ingestedEventIds = new Set<string>();
  private readonly createId: () => string;
  private readonly now: () => string;
  private readonly source: string;
  private readonly validators: UiValidatorRegistryPort;
  private readonly validation: UiRuntimeValidation;
  private readonly publisher: RuntimePublisher;
  private rules: CompiledRuleProgram | undefined;
  private storeBindings: Readonly<Record<string, import("./types.js").UiRuntimeStoreBinding>>;
  private compositionInstances: Readonly<Record<string, UiCompositionInstanceManifest>>;
  private readonly coordination: RuntimeCoordinationManager;
  private lifecycle = UnifoldRuntimeStatus.Active;

  constructor(private readonly options: UnifoldRuntimeOptions) {
    this.fabric = createEventFabric();
    this.events$ = this.fabric.fabric.events$;
    this.validators = validatorRegistry(options);
    const nodes = initialNodes(options.initialNodes).map((node) =>
      withValidatedControl(node, this.validators)
    );
    this.rules = compileRuntimeDerivedRules(options.rules, nodes);
    this.store = createRuntimeNodeStore(
      nodes,
      this.rules,
      this.validators,
      options.transactionRetention
    );
    this.createId = resolveIdFactory(options.createId);
    this.now = resolveNow(options.now);
    this.source = runtimeSource(options.source, options.documentId);
    this.publisher = this.createPublisher();
    this.validation = new UiRuntimeValidation(
      asyncValidatorRegistry(options),
      this.createId,
      (id) => readRuntimeSnapshot(this.store, id),
      (commands, context) => void this.execute(commands, context)
    );
    this.compositionInstances = initialCompositions(options.compositionInstances);
    this.storeBindings = initialStoreBindings(options);
    this.coordination = this.createCoordination();
  }
  private createPublisher(): RuntimePublisher {
    return new RuntimePublisher({
      actors: this.actors,
      createId: this.createId,
      documentId: this.options.documentId,
      fabric: this.fabric,
      now: this.now,
      snapshot: (id) => readRuntimeSnapshot(this.store, id),
      snapshots: () => this.store.getSnapshots(),
      source: this.source
    });
  }
  get revision(): number {
    return this.store.revision;
  }
  private createCoordination(): RuntimeCoordinationManager {
    return new RuntimeCoordinationManager({
      captureActors: () => this.actors.checkpoint(),
      captureAuthorities: () => ({
        compositionInstances: this.compositionInstances,
        rules: this.rules,
        storeBindings: this.storeBindings
      }),
      execute: (commands, context) => {
        this.assertActive();
        return this.executeResolved(commands, context);
      },
      installActor: (id, actor) => this.actors.register(id, actor),
      publisher: this.publisher,
      remove: (ids) => this.removeOwners(ids),
      restoreAuthorities: (checkpoint) => this.restoreAuthorities(checkpoint),
      runEffects: ({ context, effects, record }) => this.runEffects(effects, context, record),
      store: this.store,
      validate: ({ commands, context, record }) =>
        this.validation.afterCommit(commands, record, context)
    });
  }
  private restoreAuthorities(checkpoint: RuntimeAuthorityCheckpoint): void {
    this.compositionInstances = checkpoint.compositionInstances;
    this.rules = checkpoint.rules;
    this.storeBindings = checkpoint.storeBindings;
  }
  get status(): UnifoldRuntimeStatus {
    return this.lifecycle;
  }
  getSnapshot(id: UiNodeId): UiNodeSnapshot {
    return this.store.getSnapshot(id);
  }
  getTransaction(revision: number): UiTransactionRecord | undefined {
    return this.store.getTransaction(revision);
  }
  inspect(): UiRuntimeInspectionSnapshot {
    return runtimeInspection(this.store);
  }
  getValidationErrors(id: UiNodeId) {
    return this.store.getValidationErrors(id);
  }
  node(id: UiNodeId): UiNodeHandle {
    this.assertAvailable();
    this.store.getSnapshot(id);
    return createNodeHandle(id, this.store, this.fabric.fabric);
  }
  control<TValue extends JsonValue = JsonValue>(id: UiNodeId): UiControlHandle<TValue> {
    this.assertAvailable();
    return createControlHandle<TValue>(id, this.store, this.fabric.fabric, (commands) =>
      this.execute(commands)
    );
  }
  scope(id: UiNodeId): UiScopeHandle {
    this.assertAvailable();
    this.store.getSnapshot(id);
    return createScopeHandle(id, this.store, this.fabric.fabric);
  }
  composition(id: string): UiCompositionHandle {
    this.assertAvailable();
    const instance = this.compositionInstances[id];
    if (instance === undefined) throw new Error(`Unknown composition instance: ${id}.`);
    return createCompositionHandle(
      id,
      () => this.compositionInstances[id],
      this.store,
      this.fabric.fabric
    );
  }
  select<T>(selector: UiSelector<T>): UiSelection<T> {
    this.assertAvailable();
    return this.store.select(selector);
  }
  registerActor(id: UiNodeId, actor: UiActorRef): () => void {
    this.assertAvailable();
    return this.actors.register(id, actor);
  }
  replaceStoreBindings(
    bindings: Readonly<Record<string, import("./types.js").UiRuntimeStoreBinding>>
  ): void {
    this.assertActive();
    this.storeBindings = bindings;
  }
  replaceRules(
    definitions: readonly UiDerivedRuleDefinition[] | undefined,
    nodes: readonly UiNodeSnapshot[] = this.store.getSnapshots()
  ): void {
    this.assertActive();
    this.rules = compileRuntimeDerivedRules(definitions, nodes);
  }
  ingestIntent(event: UiEvent): UiEvent {
    this.assertAvailable();
    const snapshot = requireIntentSnapshot(this.store, event);
    const accepted = acceptIntent(event, this.options.documentId, this.ingestedEventIds, () =>
      this.publisher.nextSequence()
    );
    this.publisher.intent(accepted, snapshot);
    return accepted;
  }
  execute(
    commands: readonly UiCommand[],
    input: UiRuntimeExecutionContext = {}
  ): UiTransactionRecord {
    this.assertAvailable();
    return this.executeResolved(commands, input);
  }
  beginCoordination(): UnifoldRuntimeCoordination {
    this.assertAvailable();
    return this.coordination.begin();
  }
  private executeResolved(
    commands: readonly UiCommand[],
    input: UiRuntimeExecutionContext
  ): UiTransactionRecord {
    const context = resolveRuntimeExecutionContext(input, this.createId);
    try {
      return this.commit(commands, context);
    } catch (error) {
      this.publisher.rejected(context, this.store.revision);
      throw error;
    }
  }
  dispose(): void {
    if (this.lifecycle === UnifoldRuntimeStatus.Disposed) return;
    this.coordination.discardActive();
    const context = resolveRuntimeExecutionContext({}, this.createId);
    const record = unchangedRecord(context, this.store.revision, this.now());
    this.publisher.emit(UiEventType.RuntimeDisposed, context, record, {
      status: UnifoldRuntimeStatus.Disposed
    });
    this.lifecycle = UnifoldRuntimeStatus.Disposed;
    this.validation.dispose();
    this.actors.clear();
    this.ingestedEventIds.clear();
    this.store.dispose();
    this.fabric.dispose();
  }
  private commit(
    commands: readonly UiCommand[],
    context: UiResolvedRuntimeExecutionContext
  ): UiTransactionRecord {
    const snapshots = this.store.getSnapshots();
    const removedIds = removedOwnerIds(commands, snapshots);
    const bindings = this.storeBindings;
    const { derivedCommands, record } = this.transact(commands, context);
    const appliedCommands = [...commands, ...derivedCommands];
    const before = captureBoundValues(appliedCommands, bindings, snapshots);
    this.compositionInstances = reconciledCompositionInstances(commands, this.compositionInstances);
    if (!this.coordination.active) this.removeOwners(removedIds);
    const after = (id: string) => readRuntimeSnapshot(this.store, id);
    const storeWrites = storeWriteEffects(context.suppressedStoreWriteIds, before, bindings, after);
    const executedCommands = [...appliedCommands, ...storeWrites];
    const effects = this.publishCommands(executedCommands, context, record, snapshots);
    this.publisher.transaction(context, record, snapshots, commands);
    commands.forEach((command) => this.publisher.formResult(command, context, record));
    this.coordination.settle({ commands: appliedCommands, context, effects, record, removedIds });
    return record;
  }
  private transact(commands: readonly UiCommand[], context: UiResolvedRuntimeExecutionContext) {
    return transactRuntimeCommands({
      commands,
      context,
      now: this.now,
      rules: this.rules,
      store: this.store,
      validators: this.validators
    });
  }
  private publishCommands(
    commands: readonly UiCommand[],
    context: UiResolvedRuntimeExecutionContext,
    record: UiTransactionRecord,
    before: readonly UiNodeSnapshot[]
  ): readonly UiCommandEffect[] {
    return commands.flatMap((command) => {
      const isEffect = this.options.commandPort !== undefined && !isStateCommand(command);
      const effectId = this.publisher.command(command, context, record, before, isEffect);
      return effectId === undefined ? [] : [{ command, effectId }];
    });
  }
  private runEffects(
    effects: readonly UiCommandEffect[],
    context: UiResolvedRuntimeExecutionContext,
    record: UiTransactionRecord
  ): void {
    runCommandEffects(effects, context, record, {
      active: () => this.lifecycle === UnifoldRuntimeStatus.Active,
      commandPort: this.options.commandPort,
      publish: (type, command, effectContext, effectRecord, effectId) =>
        this.publisher.effect(type, command, effectContext, effectRecord, effectId)
    });
  }
  private removeOwners(ids: readonly string[]): void {
    ids.forEach((id) => this.actors.removeOwner(id));
    this.validation.remove(ids);
  }

  private assertActive(): void {
    if (this.lifecycle === UnifoldRuntimeStatus.Disposed) {
      throw new Error("The Unifold runtime is disposed.");
    }
  }

  private assertAvailable(): void {
    this.assertActive();
    this.coordination.assertAvailable();
  }
}
