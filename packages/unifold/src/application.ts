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
import { createApplicationSnapshots } from "./application-snapshots.js";
import { ApplicationCollectionCoordinator } from "./application-collection.js";
import type { UnifoldCollectionOperation } from "./authored-collection.js";
import {
  appliedUpdate,
  asError,
  captureRuntimeSnapshots,
  elementRegistrationDiagnostic,
  errorDiagnostic,
  executePreparedReconciliation,
  firstDiagnostic,
  focusedNodeId,
  isApplicationDiagnostic,
  migratedFocusedNodeId,
  prepareApplicationUpdate,
  prepareCompositionMigration,
  publishRuntimeSemantics,
  reconcileCommand,
  replaceStoreCommands,
  rejectedUpdate,
  requirePrepared,
  rollbackResultDiagnostic,
  reverseMigrationPlan,
  restoreFocus,
  unavailableDiagnostic,
  updateInProgressDiagnostic,
  updateFailureStage
} from "./application-update.js";
import { commandForEvent, eventExecutionContext } from "./event-command.js";
import { createUiMachineCoordinator, type UiMachineCoordinator } from "./machine-coordinator.js";
import { UiSemanticCoordinator, semanticSnapshotRecord } from "./semantic-coordinator.js";
import { prepareApplicationStores, type PreparedApplicationStores } from "./store-adapters.js";
import type { StoreCommandController } from "./store-command-port.js";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldPreparationStatus,
  type MountUnifoldApplicationOptions,
  type PreparedUnifoldDocument,
  type UiStoreAdapterRegistry,
  type UnifoldApplicationDiagnostic,
  type UnifoldApplicationUpdateResult
} from "./types.js";
export class UnifoldApplication {
  readonly runtime: UnifoldRuntime;
  readonly renderer: DomRenderController;
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
    this.runtime = runtime;
    this.renderer = renderer;
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
  applyCollectionOperation(operation: UnifoldCollectionOperation): UnifoldApplicationUpdateResult {
    if (this.unavailable) return rejectedUpdate(this.runtime.revision, [unavailableDiagnostic()]);
    if (this.updating) return rejectedUpdate(this.runtime.revision, [updateInProgressDiagnostic()]);
    return this.collections.apply(this.current, operation, this.runtime.revision, (next) =>
      this.update(next)
    );
  }
  update(authored: unknown): UnifoldApplicationUpdateResult {
    if (this.unavailable) return rejectedUpdate(this.runtime.revision, [unavailableDiagnostic()]);
    if (this.updating) return rejectedUpdate(this.runtime.revision, [updateInProgressDiagnostic()]);
    const preparation = prepareApplicationUpdate(authored, this.applicationOptions);
    if (preparation.status === UnifoldPreparationStatus.Invalid) {
      return rejectedUpdate(this.runtime.revision, preparation.diagnostics);
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
    this.renderer.dispose();
    this.semantics?.dispose();
    this.machines.dispose();
    this.runtime.dispose();
  }
  private applyPrepared(next: PreparedUnifoldDocument): UnifoldApplicationUpdateResult {
    const migration = prepareCompositionMigration(
      this.current.document,
      next.document,
      this.compositionMigrations
    );
    if (isApplicationDiagnostic(migration))
      return rejectedUpdate(this.runtime.revision, [migration]);
    return this.applyMigrated(next, migration);
  }
  private applyMigrated(
    next: PreparedUnifoldDocument,
    migration: UiCompositionMigrationPlan
  ): UnifoldApplicationUpdateResult {
    const stores = this.prepareStores(next.document);
    if (stores instanceof Error) {
      return rejectedUpdate(this.runtime.revision, [
        errorDiagnostic(stores, UnifoldApplicationDiagnosticStage.Store)
      ]);
    }
    const diagnostic = this.configurationDiagnostic(next.document, stores);
    if (diagnostic !== undefined) return rejectedUpdate(this.runtime.revision, [diagnostic]);
    return this.commitPrepared(next, stores, migration);
  }
  private prepareStores(document: UnifoldIrDocument): PreparedApplicationStores | Error {
    try {
      return prepareApplicationStores(document, this.storeAdapters);
    } catch (error) {
      return error instanceof Error ? error : new Error("Unknown store preparation failure.");
    }
  }
  private configurationDiagnostic(document: UnifoldIrDocument, stores: PreparedApplicationStores) {
    return firstDiagnostic([
      elementRegistrationDiagnostic(this.container, document, this.applicationOptions),
      this.validateMachines(document),
      this.rendererDiagnostic(document),
      this.semanticDiagnostic(document, stores)
    ]);
  }

  private semanticDiagnostic(
    document: UnifoldIrDocument,
    stores: PreparedApplicationStores
  ): UnifoldApplicationDiagnostic | undefined {
    try {
      const snapshots = createApplicationSnapshots(document, this.runtime.revision, stores);
      this.semantics?.validate(document, semanticSnapshotRecord(snapshots));
      return undefined;
    } catch (error) {
      return errorDiagnostic(error, UnifoldApplicationDiagnosticStage.Semantics);
    }
  }

  private rendererDiagnostic(document: UnifoldIrDocument) {
    try {
      this.renderer.validate(document);
      return undefined;
    } catch (error) {
      return errorDiagnostic(error, UnifoldApplicationDiagnosticStage.Renderer);
    }
  }

  private validateMachines(document: UnifoldIrDocument): UnifoldApplicationDiagnostic | undefined {
    try {
      this.machines.validate(document.machines);
      return undefined;
    } catch (error) {
      return errorDiagnostic(error, UnifoldApplicationDiagnosticStage.Workflow);
    }
  }

  private commitPrepared(
    next: PreparedUnifoldDocument,
    nextStores: PreparedApplicationStores,
    migration: UiCompositionMigrationPlan
  ): UnifoldApplicationUpdateResult {
    const previous = this.current;
    const previousStores = this.stores;
    const previousRevision = this.runtime.revision;
    const previousNodes = captureRuntimeSnapshots(this.runtime, previous.document, this.renderer);
    this.stageCandidate(next, nextStores);
    this.updating = true;
    try {
      const metadata = this.collections.current;
      executePreparedReconciliation(this.runtime, next, nextStores, migration, metadata);
    } catch (error) {
      const rollbackError = this.restoreRuntime(
        previous,
        previousStores,
        previousRevision,
        previousNodes,
        migration
      );
      this.updating = false;
      return rejectedUpdate(this.runtime.revision, [
        rollbackResultDiagnostic(rollbackError, error, UnifoldApplicationDiagnosticStage.Runtime)
      ]);
    }
    return this.commitRenderer(previous, previousStores, previousNodes, migration, next);
  }

  private commitRenderer(
    previous: PreparedUnifoldDocument,
    previousStores: PreparedApplicationStores,
    previousNodes: readonly UiNodeSnapshot[],
    migration: UiCompositionMigrationPlan,
    next: PreparedUnifoldDocument
  ): UnifoldApplicationUpdateResult {
    try {
      this.renderer.update(next.document);
      this.projectAll(next.document);
      restoreFocus(this.renderer, migratedFocusedNodeId(previousNodes, migration));
      this.machines.replace(next.document.machines, next.document.nodesById);
      this.semantics?.publishRuntime(next.document, this.runtime);
      return appliedUpdate(this.runtime.revision);
    } catch (error) {
      const rollbackError = this.restore(previous, previousStores, previousNodes, migration);
      return rejectedUpdate(this.runtime.revision, [
        rollbackResultDiagnostic(rollbackError, error, updateFailureStage(error))
      ]);
    } finally {
      this.updating = false;
    }
  }

  private restore(
    previous: PreparedUnifoldDocument,
    previousStores: PreparedApplicationStores,
    previousNodes: readonly UiNodeSnapshot[],
    migration: UiCompositionMigrationPlan
  ): Error | undefined {
    try {
      this.current = previous;
      this.stores = previousStores;
      this.runtime.replaceStoreBindings(previousStores.bindings);
      replaceStoreCommands(this.storeCommands, previous.document, previousStores);
      this.runtime.replaceRules(previous.document.rules, previousNodes);
      this.runtime.execute([
        reconcileCommand(previous.document, previousNodes, reverseMigrationPlan(migration))
      ]);
      this.renderer.update(previous.document);
      this.projectAll(previous.document);
      restoreFocus(this.renderer, focusedNodeId(previousNodes));
      this.machines.replace(previous.document.machines, previous.document.nodesById);
      publishRuntimeSemantics(this.semantics, previous.document, this.runtime);
      return undefined;
    } catch (error) {
      this.dispose();
      return asError(error);
    }
  }

  private restoreRuntime(
    previous: PreparedUnifoldDocument,
    previousStores: PreparedApplicationStores,
    previousRevision: number,
    previousNodes: readonly UiNodeSnapshot[],
    migration: UiCompositionMigrationPlan
  ): Error | undefined {
    try {
      this.current = previous;
      this.stores = previousStores;
      this.runtime.replaceStoreBindings(previousStores.bindings);
      replaceStoreCommands(this.storeCommands, previous.document, previousStores);
      this.runtime.replaceRules(previous.document.rules, previousNodes);
      this.restoreRuntimeTransaction(previous, previousRevision, previousNodes, migration);
      return undefined;
    } catch (error) {
      this.dispose();
      return asError(error);
    }
  }

  private stageCandidate(next: PreparedUnifoldDocument, stores: PreparedApplicationStores): void {
    this.current = next;
    this.stores = stores;
    this.runtime.replaceStoreBindings(stores.bindings);
    this.storeCommands?.replace(next.document, stores);
  }

  private restoreRuntimeTransaction(
    previous: PreparedUnifoldDocument,
    previousRevision: number,
    previousNodes: readonly UiNodeSnapshot[],
    migration: UiCompositionMigrationPlan
  ): void {
    if (this.runtime.revision === previousRevision) return;
    this.runtime.execute([
      reconcileCommand(previous.document, previousNodes, reverseMigrationPlan(migration))
    ]);
  }

  private readonly onElementEvent = (event: Event): void => {
    const uiEvent = (event as CustomEvent<UiEvent>).detail;
    const accepted = this.runtime.ingestIntent(uiEvent);
    const command = commandForEvent(accepted);
    if (command !== undefined) this.runtime.execute([command], eventExecutionContext(accepted));
  };

  private readonly onRuntimeEvent = (event: UiEvent): void => {
    if (this.updating) return;
    if (event.type !== UiEventType.TransactionCommitted) return;
    this.projectTransaction(event.staterevision);
    this.refreshSemantics();
  };

  private refreshSemantics(): void {
    this.semantics?.refreshRuntime(this.current.document, this.runtime);
  }

  private projectTransaction(revision: number): void {
    const record = this.runtime.getTransaction(revision);
    if (record === undefined) return;
    record.changedNodeIds.forEach((id) => this.projectKnown(id));
  }

  private projectKnown(id: string): void {
    if (this.current.document.nodesById[id] === undefined) return;
    this.renderer.project(this.runtime.getSnapshot(id), this.runtime.getValidationErrors(id));
  }

  private projectAll(document: UnifoldIrDocument): void {
    document.renderOrder.forEach((id) => this.projectKnown(id));
  }
}
