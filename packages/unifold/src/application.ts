import { ElementEventName } from "@unislang/unifold-elements";
import { type UiEvent } from "@unislang/unifold-events";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import type { DomRenderController } from "@unislang/unifold-renderer-dom";
import {
  UnifoldRuntime,
  type UiExecutionContext,
  type UnifoldRuntimeCoordination
} from "@unislang/unifold-runtime";
import type { UiMachineCommandRegistry, UiMachineGuardRegistry } from "@unislang/unifold-xstate";
import type { Subscription } from "rxjs";
import {
  planCompositionMigration,
  type UiCompositionMigrationPlan,
  type UiCompositionVersionMigration
} from "./composition-migrations.js";
import { ApplicationCollectionCoordinator } from "./application-collection.js";
import {
  asApplicationError,
  atomicUpdateDiagnostic,
  atomicUpdateFailureStage
} from "./application-atomicity.js";
import {
  collectionFocusTarget,
  focusExecutionContext as focusContext,
  focusedNodeId,
  requireAvailableFocusTarget,
  restoreApplicationFocus,
  restoreFocus
} from "./application-focus.js";
import { createApplicationRenderer } from "./application-renderer.js";
import { createApplicationRuntime } from "./application-runtime.js";
import { ApplicationProjectionController } from "./application-projection.js";
import type { UnifoldCollectionOperation } from "./authored-collection.js";
import {
  appliedUpdate,
  captureApplicationUpdateCheckpoint,
  elementRegistrationDiagnostic,
  errorDiagnostic,
  executePreparedReconciliation,
  firstDiagnostic,
  isApplicationDiagnostic,
  machineConfigurationDiagnostic,
  prepareApplicationUpdate,
  prepareCompositionMigration,
  replaceStoreCommands,
  rejectedUpdate,
  rendererConfigurationDiagnostic,
  requirePrepared,
  semanticConfigurationDiagnostic,
  structuralUpdateDiagnostic,
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
  private readonly projection: ApplicationProjectionController;
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
    this.projection = this.createProjection(runtime, renderer, semantics);
    this.container.addEventListener(ElementEventName.UiEvent, this.onElementEvent);
    this.subscription = runtime.events$.subscribe(this.projection.onRuntimeEvent);
    this.projection.projectAll(this.current.document);
    this.machines.replace(prepared.document.machines, prepared.document.nodesById);
  }
  private createProjection(
    runtime: UnifoldRuntime,
    renderer: DomRenderController,
    semantics: UiSemanticCoordinator | undefined
  ): ApplicationProjectionController {
    return new ApplicationProjectionController({
      document: () => this.current.document,
      renderer,
      runtime,
      ...(semantics === undefined ? {} : { semantics }),
      updating: () => this.updating
    });
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
    const focusTarget = collectionFocusTarget(
      checkpoint.previousNodes,
      next.document,
      this.collections.current?.metadata
    );
    const coordination = this.#engine.beginCoordination();
    this.updating = true;
    return this.reconcilePrepared(
      checkpoint,
      coordination,
      migration,
      next,
      nextStores,
      focusTarget
    );
  }
  private reconcilePrepared(
    checkpoint: ApplicationUpdateCheckpoint,
    coordination: UnifoldRuntimeCoordination,
    migration: UiCompositionMigrationPlan,
    next: PreparedUnifoldDocument,
    nextStores: PreparedApplicationStores,
    focusTarget: string | undefined
  ): UnifoldApplicationUpdateResult {
    try {
      this.stageCandidate(next, nextStores);
      const reconciliation = executePreparedReconciliation(
        this.#engine,
        coordination,
        next,
        nextStores,
        migration,
        this.collections.current
      );
      requireAvailableFocusTarget(this.#engine, next.document, focusTarget);
      const context = focusContext(reconciliation);
      return this.renderCommit(checkpoint, coordination, migration, next, focusTarget, context);
    } catch (error) {
      const rollbackError = this.discardCandidate(checkpoint, coordination);
      this.updating = false;
      return rejectedUpdate(this.#engine.revision, [
        atomicUpdateDiagnostic(rollbackError, error, UnifoldApplicationDiagnosticStage.Runtime)
      ]);
    }
  }
  private renderCommit(
    checkpoint: ApplicationUpdateCheckpoint,
    coordination: UnifoldRuntimeCoordination,
    migration: UiCompositionMigrationPlan,
    next: PreparedUnifoldDocument,
    focusTarget: string | undefined,
    context: UiExecutionContext
  ): UnifoldApplicationUpdateResult {
    const nodes = checkpoint.previousNodes;
    try {
      this.#renderer.update(next.document);
      this.projection.projectAll(next.document);
      this.semantics?.publishRuntime(next.document, this.#engine);
      this.machines.replace(next.document.machines, next.document.nodesById, coordination);
      this.projection.ignoreRevision(this.#engine.revision);
      coordination.commit();
      this.projection.finishCommit();
    } catch (error) {
      const rollbackError = this.restore(checkpoint, coordination);
      this.updating = false;
      return rejectedUpdate(this.#engine.revision, [
        atomicUpdateDiagnostic(rollbackError, error, atomicUpdateFailureStage(error))
      ]);
    }
    this.updating = false;
    restoreApplicationFocus(this.#engine, this.#renderer, nodes, migration, focusTarget, context);
    return appliedUpdate(this.#engine.revision);
  }
  private restore(
    checkpoint: ApplicationUpdateCheckpoint,
    coordination: UnifoldRuntimeCoordination
  ): Error | undefined {
    const { previous, previousNodes, previousStores } = checkpoint;
    try {
      coordination.discard();
      this.current = previous;
      this.stores = previousStores;
      replaceStoreCommands(this.storeCommands, previous.document, previousStores);
      this.#renderer.update(previous.document);
      this.projection.projectAll(previous.document);
      restoreFocus(this.#renderer, focusedNodeId(previousNodes));
      this.semantics?.publishRuntime(previous.document, this.#engine);
      return undefined;
    } catch (error) {
      this.dispose();
      return asApplicationError(error);
    }
  }
  private discardCandidate(
    checkpoint: ApplicationUpdateCheckpoint,
    coordination: UnifoldRuntimeCoordination
  ): Error | undefined {
    try {
      coordination.discard();
      this.current = checkpoint.previous;
      this.stores = checkpoint.previousStores;
      replaceStoreCommands(
        this.storeCommands,
        checkpoint.previous.document,
        checkpoint.previousStores
      );
      return undefined;
    } catch (error) {
      this.dispose();
      return asApplicationError(error);
    }
  }
  private stageCandidate(next: PreparedUnifoldDocument, stores: PreparedApplicationStores): void {
    this.current = next;
    this.stores = stores;
    this.#engine.replaceStoreBindings(stores.bindings);
    this.storeCommands?.replace(next.document, stores);
  }
  private readonly onElementEvent = (event: Event): void => {
    if (this.updating) return;
    const uiEvent = (event as CustomEvent<UiEvent>).detail;
    const accepted = this.#engine.ingestIntent(uiEvent);
    const command = commandForEvent(accepted);
    if (command !== undefined) this.#engine.execute([command], eventExecutionContext(accepted));
  };
}
