import {
  UiEventType,
  type UiCommand,
  type UiEvent,
  type UiNodeId,
  type UiNodeSnapshot,
  type UiTransactionRecord
} from "@unislang/unifold-events";
import type {
  UiCompositionInstanceManifest,
  UiDerivedRuleDefinition
} from "@unislang/unifold-contracts";
import {
  createAsyncValidatorRegistry,
  createValidatorRegistry,
  withValidatedControl,
  type UiValidatorRegistryPort
} from "@unislang/unifold-forms";
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
import { applyStateCommand, isStateCommand } from "./command-handlers.js";
import {
  applyRuntimeDerivedRules,
  compileRuntimeDerivedRules,
  createRuntimeNodeStore
} from "./derived-rules.js";
import { createCompositionHandle } from "./composition-handle.js";
import { acceptIntent } from "./intent-ingress.js";
import { createNodeHandle, createScopeHandle } from "./node-handle.js";
import { RuntimePublisher } from "./runtime-publisher.js";
import { UiRuntimeValidation } from "./runtime-validation.js";
import {
  initialCompositions,
  initialNodes,
  initialStoreBindings,
  resolveIdFactory,
  resolveNow,
  runtimeInspection,
  runtimeSource,
  transactionMetadata,
  unchangedRecord,
  valueOrCreate,
  valueOrDefault
} from "./runtime-helpers.js";
import { reconciledCompositionInstances, removedOwnerIds } from "./structure-reconciliation.js";
import { ruleCommandDependencies } from "./rule-command-dependencies.js";
import { captureBoundValues, storeWriteEffects } from "./store-write.js";
import { runCommandEffects } from "./effect-runner.js";
import {
  UnifoldRuntimeStatus,
  type UiRuntimeExecutionContext,
  type UiCompositionHandle,
  type UiNodeHandle,
  type RuntimeTransactionResult,
  type UiRuntimeInspectionSnapshot,
  type UiScopeHandle,
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
      (id) => this.safeSnapshot(id),
      (commands, context) => void this.execute(commands, context)
    );
    this.compositionInstances = initialCompositions(options.compositionInstances);
    this.storeBindings = initialStoreBindings(options);
  }

  get revision(): number {
    return this.store.revision;
  }

  private createPublisher(): RuntimePublisher {
    return new RuntimePublisher({
      actors: this.actors,
      createId: this.createId,
      documentId: this.options.documentId,
      fabric: this.fabric,
      now: this.now,
      snapshot: (id) => this.safeSnapshot(id),
      snapshots: () => this.store.getSnapshots(),
      source: this.source
    });
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
    this.assertActive();
    this.store.getSnapshot(id);
    return createNodeHandle(id, this.store, this.fabric.fabric);
  }

  scope(id: UiNodeId): UiScopeHandle {
    this.assertActive();
    this.store.getSnapshot(id);
    return createScopeHandle(id, this.store, this.fabric.fabric);
  }

  composition(id: string): UiCompositionHandle {
    this.assertActive();
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
    this.assertActive();
    return this.store.select(selector);
  }

  registerActor(id: UiNodeId, actor: UiActorRef): () => void {
    this.assertActive();
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
    this.assertActive();
    const snapshot = this.intentSnapshot(event);
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
    this.assertActive();
    const context = this.resolveContext(input);
    try {
      return this.commit(commands, context);
    } catch (error) {
      this.publisher.rejected(context, this.store.revision);
      throw error;
    }
  }

  dispose(): void {
    if (this.lifecycle === UnifoldRuntimeStatus.Disposed) return;
    const context = this.resolveContext({});
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
    context: Required<UiRuntimeExecutionContext>
  ): UiTransactionRecord {
    const snapshots = this.store.getSnapshots();
    const removedIds = removedOwnerIds(commands, snapshots);
    const bindings = this.storeBindings;
    const { derivedCommands, record } = this.transact(commands, context);
    const appliedCommands = [...commands, ...derivedCommands];
    const before = captureBoundValues(appliedCommands, bindings, snapshots);
    this.compositionInstances = reconciledCompositionInstances(commands, this.compositionInstances);
    removedIds.forEach((id) => this.actors.removeOwner(id));
    this.validation.remove(removedIds);
    const after = (id: string) => this.safeSnapshot(id);
    const storeWrites = storeWriteEffects(context.suppressedStoreWriteIds, before, bindings, after);
    const executedCommands = [...appliedCommands, ...storeWrites];
    executedCommands.forEach((command) =>
      this.publisher.command(command, context, record, snapshots)
    );
    this.publisher.transaction(context, record, snapshots);
    commands.forEach((command) => this.publisher.formResult(command, context, record));
    this.runEffects(
      executedCommands.filter((command) => !isStateCommand(command)),
      context,
      record
    );
    this.validation.afterCommit(appliedCommands, record, context);
    return record;
  }

  private transact(
    commands: readonly UiCommand[],
    context: Required<UiRuntimeExecutionContext>
  ): RuntimeTransactionResult {
    let derivedCommands: readonly UiCommand[] = [];
    const record = this.store.transact(transactionMetadata(context, this.now()), (draft) => {
      const stateCommands = commands.filter(isStateCommand);
      const dependencies = this.ruleDependencies(stateCommands, draft);
      stateCommands.forEach((command) => applyStateCommand(draft, command, this.validators));
      if (this.rules !== undefined) {
        derivedCommands = applyRuntimeDerivedRules(
          this.rules,
          dependencies,
          draft,
          this.validators
        );
      }
    });
    return { derivedCommands, record };
  }

  private ruleDependencies(
    commands: readonly UiCommand[],
    draft: import("@unislang/unifold-reactivity").UiNodeTransactionDraft
  ) {
    return this.rules === undefined ? [] : ruleCommandDependencies(commands, draft, this.rules);
  }

  private runEffects(
    commands: readonly UiCommand[],
    context: Required<UiRuntimeExecutionContext>,
    record: UiTransactionRecord
  ): void {
    runCommandEffects(commands, context, record, {
      active: () => this.lifecycle === UnifoldRuntimeStatus.Active,
      commandPort: this.options.commandPort,
      publish: (type, command, effectContext, effectRecord) =>
        this.publisher.effect(type, command, effectContext, effectRecord)
    });
  }

  private resolveContext(input: UiRuntimeExecutionContext): Required<UiRuntimeExecutionContext> {
    const transactionId = valueOrCreate(input.transactionId, this.createId);
    return {
      transactionId,
      correlationId: valueOrDefault(input.correlationId, transactionId),
      causationId: valueOrDefault(input.causationId, transactionId),
      suppressedStoreWriteIds: input.suppressedStoreWriteIds ?? []
    };
  }

  private safeSnapshot(id: UiNodeId): UiNodeSnapshot | undefined {
    try {
      return this.store.getSnapshot(id);
    } catch {
      return undefined;
    }
  }

  private intentSnapshot(event: UiEvent): UiNodeSnapshot {
    const source = event.data.sourceNode;
    if (source === undefined) throw new Error("Intent source node is missing.");
    const snapshot = this.safeSnapshot(source.id);
    if (snapshot === undefined) throw new Error(`Intent source node is unknown: ${source.id}.`);
    return snapshot;
  }

  private assertActive(): void {
    if (this.lifecycle === UnifoldRuntimeStatus.Disposed) {
      throw new Error("The Unifold runtime is disposed.");
    }
  }
}

function validatorRegistry(options: UnifoldRuntimeOptions): UiValidatorRegistryPort {
  return options.validatorRegistry ?? createValidatorRegistry();
}

function asyncValidatorRegistry(options: UnifoldRuntimeOptions) {
  return options.asyncValidatorRegistry ?? createAsyncValidatorRegistry();
}
