import { ElementEventName } from "@unislang/unifold-elements";
import { UiEventType, type UiEvent, type UiNodeSnapshot } from "@unislang/unifold-events";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import type { DomRenderController } from "@unislang/unifold-renderer-dom";
import { UnifoldRuntime } from "@unislang/unifold-runtime";
import type { UiMachineCommandRegistry, UiMachineGuardRegistry } from "@unislang/unifold-xstate";
import type { Subscription } from "rxjs";
import {
  planCompositionMigration,
  type UiCompositionMigrationPlan,
  type UiCompositionVersionMigration
} from "./composition-migrations.js";
import { ApplicationCollectionCoordinator } from "./application-collection.js";
import {
  collectionExecutionContext,
  collectionFocusTarget,
  focusedNodeId,
  restoreApplicationFocus,
  restoreFocus
} from "./application-focus.js";
import { createApplicationRenderer } from "./application-renderer.js";
import { createApplicationRuntime } from "./application-runtime.js";
import type { UnifoldCollectionOperation } from "./authored-collection.js";
import {
  appliedUpdate,
  asError,
  captureApplicationUpdateCheckpoint,
  elementRegistrationDiagnostic,
  errorDiagnostic,
  executePreparedReconciliation,
  firstDiagnostic,
  isApplicationDiagnostic,
  machineConfigurationDiagnostic,
  prepareApplicationUpdate,
  prepareCompositionMigration,
  publishRuntimeSemantics,
  reconcileCommand,
  replaceStoreCommands,
  rejectedUpdate,
  rendererConfigurationDiagnostic,
  requirePrepared,
  rollbackResultDiagnostic,
  reverseMigrationPlan,
  semanticConfigurationDiagnostic,
  structuralUpdateDiagnostic,
  updateFailureStage,
  type ApplicationUpdateCheckpoint
} from "./application-update.js";
import { commandForEvent, eventExecutionContext } from "./event-command.js";
import { createUiMachineCoordinator, type UiMachineCoordinator } from "./machine-coordinator.js";
import { UiSemanticCoordinator } from "./semantic-coordinator.js";
import { prepareUpdatedStores, type PreparedApplicationStores } from "./store-adapters.js";
import type { StoreCommandController } from "./store-command-port.js";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldPreparationStatus,
  type MountUnifoldApplicationOptions,
  type PreparedUnifoldDocument,
  type UiStoreAdapterRegistry,
  type UnifoldApplicationRendererPort,
  type UnifoldApplicationRuntimePort,
  type UnifoldApplicationUpdateResult,
  type UiOriginatingExecutionContext
} from "./types.js";
export class UnifoldApplication {
  readonly runtime: UnifoldApplicationRuntimePort;
  readonly renderer: UnifoldApplicationRendererPort;
  readonly #engine: UnifoldRuntime;
  readonly #renderer: DomRenderController;
  private current: PreparedUnifoldDocument;
  private readonly machines: UiMachineCoordinator;
  private readonly subscription: Subscription;
  private stores: PreparedApplicationStores;
  private unavailable = false;
  private updating = false;
  private readonly collections = new ApplicationCollectionCoordinator();
  constructor(
    prepared: PreparedUnifoldDocument,
    private readonly container: HTMLElement,
    runtime: UnifoldRuntime,
    renderer: DomRenderController,
    stores: PreparedApplicationStores,
    private readonly storeAdapters: UiStoreAdapterRegistry,
    machineCommands?: UiMachineCommandRegistry,
    machineGuards?: UiMachineGuardRegistry,
    private readonly storeCommands?: StoreCommandController,
    private readonly semantics?: UiSemanticCoordinator,
    private readonly compositionMigrations: readonly UiCompositionVersionMigration[] = [],
    private readonly applicationOptions: MountUnifoldApplicationOptions = {}
  ) {
    planCompositionMigration(prepared.document, prepared.document, compositionMigrations);
    this.current = prepared;
    this.stores = stores;
    this.#engine = runtime;
    this.#renderer = renderer;
    this.runtime = createApplicationRuntime(runtime);
    this.renderer = createApplicationRenderer(renderer);
    this.machines = createUiMachineCoordinator(runtime, machineCommands, machineGuards);
    this.machines.validate(prepared.document.machines);
    this.container.addEventListener(ElementEventName.UiEvent, this.onElementEvent);
    this.subscription = runtime.events$.subscribe(this.onRuntimeEvent);
    this.projectAll(this.current.document);
    this.machines.replace(prepared.document.machines, prepared.document.nodesById);
  }
  get document(): UnifoldIrDocument {
    return this.current.document;
  }
  get authored(): unknown {
    return structuredClone(this.current.authored);
  }
  applyCollectionOperation(
    operation: UnifoldCollectionOperation,
    origin?: UiOriginatingExecutionContext
  ): UnifoldApplicationUpdateResult {
    const diagnostic = structuralUpdateDiagnostic(this.unavailable, this.updating);
    if (diagnostic !== undefined) return rejectedUpdate(this.#engine.revision, [diagnostic]);
    return this.collections.apply(
      this.current,
      operation,
      this.#engine.revision,
      (next) => this.update(next),
      origin
    );
  }
  update(authored: unknown): UnifoldApplicationUpdateResult {
    const diagnostic = structuralUpdateDiagnostic(this.unavailable, this.updating);
    if (diagnostic !== undefined) return rejectedUpdate(this.#engine.revision, [diagnostic]);
    const preparation = prepareApplicationUpdate(authored, this.applicationOptions);
    if (preparation.status === UnifoldPreparationStatus.Invalid) {
      return rejectedUpdate(this.#engine.revision, preparation.diagnostics);
    }
    return this.applyPrepared(requirePrepared(preparation.prepared));
  }
  machineState(id: string) {
    return this.machines.state(id);
  }
  dispose(): void {
    if (this.unavailable) return;
    this.unavailable = true;
    this.container.removeEventListener(ElementEventName.UiEvent, this.onElementEvent);
    this.subscription.unsubscribe();
    this.#renderer.dispose();
    this.semantics?.dispose();
    this.machines.dispose();
    this.#engine.dispose();
  }
  private applyPrepared(next: PreparedUnifoldDocument): UnifoldApplicationUpdateResult {
    const migration = prepareCompositionMigration(
      this.current.document,
      next.document,
      this.compositionMigrations
    );
    if (isApplicationDiagnostic(migration))
      return rejectedUpdate(this.#engine.revision, [migration]);
    return this.applyMigrated(next, migration);
  }
  private applyMigrated(
    next: PreparedUnifoldDocument,
    migration: UiCompositionMigrationPlan
  ): UnifoldApplicationUpdateResult {
    const stores = prepareUpdatedStores(next.document, this.storeAdapters);
    if (stores instanceof Error) {
      return rejectedUpdate(this.#engine.revision, [
        errorDiagnostic(stores, UnifoldApplicationDiagnosticStage.Store)
      ]);
    }
    const diagnostic = this.configurationDiagnostic(next.document, stores);
    if (diagnostic !== undefined) return rejectedUpdate(this.#engine.revision, [diagnostic]);
    return this.commitPrepared(next, stores, migration);
  }
  private configurationDiagnostic(document: UnifoldIrDocument, stores: PreparedApplicationStores) {
    return firstDiagnostic([
      elementRegistrationDiagnostic(this.container, document, this.applicationOptions),
      machineConfigurationDiagnostic(this.machines, document),
      rendererConfigurationDiagnostic(this.#renderer, document),
      semanticConfigurationDiagnostic(this.semantics, document, stores, this.#engine.revision)
    ]);
  }

  private commitPrepared(
    next: PreparedUnifoldDocument,
    nextStores: PreparedApplicationStores,
    migration: UiCompositionMigrationPlan
  ): UnifoldApplicationUpdateResult {
    const checkpoint = captureApplicationUpdateCheckpoint(
      this.current,
      this.stores,
      this.#engine,
      this.#renderer
    );
    const collection = this.collections.current;
    const focusTarget = collectionFocusTarget(
      checkpoint.previousNodes,
      next.document,
      collection?.metadata
    );
    this.stageCandidate(next, nextStores);
    this.updating = true;
    try {
      executePreparedReconciliation(this.#engine, next, nextStores, migration, collection);
    } catch (error) {
      const rollbackError = this.restoreRuntime(checkpoint, migration);
      this.updating = false;
      return rejectedUpdate(this.#engine.revision, [
        rollbackResultDiagnostic(rollbackError, error, UnifoldApplicationDiagnosticStage.Runtime)
      ]);
    }
    return this.commitRenderer(checkpoint, migration, next, focusTarget);
  }

  private commitRenderer(
    checkpoint: ApplicationUpdateCheckpoint,
    migration: UiCompositionMigrationPlan,
    next: PreparedUnifoldDocument,
    focusTarget: string | undefined
  ): UnifoldApplicationUpdateResult {
    let result: UnifoldApplicationUpdateResult;
    const nodes = checkpoint.previousNodes;
    const context = collectionExecutionContext(this.collections.current);
    try {
      this.#renderer.update(next.document);
      this.projectAll(next.document);
      this.machines.replace(next.document.machines, next.document.nodesById);
      this.semantics?.publishRuntime(next.document, this.#engine);
      restoreApplicationFocus(this.#engine, this.#renderer, nodes, migration, focusTarget, context);
      result = appliedUpdate(this.#engine.revision);
    } catch (error) {
      const rollbackError = this.restore(checkpoint, migration);
      result = rejectedUpdate(this.#engine.revision, [
        rollbackResultDiagnostic(rollbackError, error, updateFailureStage(error))
      ]);
    }
    this.updating = false;
    return result;
  }

  private restore(
    checkpoint: ApplicationUpdateCheckpoint,
    migration: UiCompositionMigrationPlan
  ): Error | undefined {
    const { previous, previousNodes, previousStores } = checkpoint;
    try {
      this.current = previous;
      this.stores = previousStores;
      this.#engine.replaceStoreBindings(previousStores.bindings);
      replaceStoreCommands(this.storeCommands, previous.document, previousStores);
      this.#engine.replaceRules(previous.document.rules, previousNodes);
      this.#engine.execute([
        reconcileCommand(previous.document, previousNodes, reverseMigrationPlan(migration))
      ]);
      this.#renderer.update(previous.document);
      this.projectAll(previous.document);
      restoreFocus(this.#renderer, focusedNodeId(previousNodes));
      this.machines.replace(previous.document.machines, previous.document.nodesById);
      publishRuntimeSemantics(this.semantics, previous.document, this.#engine);
      return undefined;
    } catch (error) {
      this.dispose();
      return asError(error);
    }
  }

  private restoreRuntime(
    checkpoint: ApplicationUpdateCheckpoint,
    migration: UiCompositionMigrationPlan
  ): Error | undefined {
    try {
      this.current = checkpoint.previous;
      this.stores = checkpoint.previousStores;
      this.#engine.replaceStoreBindings(checkpoint.previousStores.bindings);
      replaceStoreCommands(
        this.storeCommands,
        checkpoint.previous.document,
        checkpoint.previousStores
      );
      this.#engine.replaceRules(checkpoint.previous.document.rules, checkpoint.previousNodes);
      this.restoreRuntimeTransaction(
        checkpoint.previous,
        checkpoint.previousRevision,
        checkpoint.previousNodes,
        migration
      );
      return undefined;
    } catch (error) {
      this.dispose();
      return asError(error);
    }
  }

  private stageCandidate(next: PreparedUnifoldDocument, stores: PreparedApplicationStores): void {
    this.current = next;
    this.stores = stores;
    this.#engine.replaceStoreBindings(stores.bindings);
    this.storeCommands?.replace(next.document, stores);
  }

  private restoreRuntimeTransaction(
    previous: PreparedUnifoldDocument,
    previousRevision: number,
    previousNodes: readonly UiNodeSnapshot[],
    migration: UiCompositionMigrationPlan
  ): void {
    if (this.#engine.revision === previousRevision) return;
    this.#engine.execute([
      reconcileCommand(previous.document, previousNodes, reverseMigrationPlan(migration))
    ]);
  }

  private readonly onElementEvent = (event: Event): void => {
    const uiEvent = (event as CustomEvent<UiEvent>).detail;
    const accepted = this.#engine.ingestIntent(uiEvent);
    const command = commandForEvent(accepted);
    if (command !== undefined) this.#engine.execute([command], eventExecutionContext(accepted));
  };

  private readonly onRuntimeEvent = (event: UiEvent): void => {
    if (this.updating || event.type !== UiEventType.TransactionCommitted) return;
    this.projectTransaction(event.staterevision);
    this.refreshSemantics();
  };

  private refreshSemantics(): void {
    this.semantics?.refreshRuntime(this.current.document, this.#engine);
  }

  private projectTransaction(revision: number): void {
    const record = this.#engine.getTransaction(revision);
    if (record === undefined) return;
    record.changedNodeIds.forEach((id) => this.projectKnown(id));
  }

  private projectKnown(id: string): void {
    if (this.current.document.nodesById[id] === undefined) return;
    this.#renderer.project(this.#engine.getSnapshot(id), this.#engine.getValidationErrors(id));
  }

  private projectAll(document: UnifoldIrDocument): void {
    document.renderOrder.forEach((id) => this.projectKnown(id));
  }
}
