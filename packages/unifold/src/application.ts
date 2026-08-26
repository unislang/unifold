import { ElementEventName } from "@unislang/unifold-elements";
import {
  UiCommandType,
  UiEventType,
  type StructureReconcileCommand,
  type UiEvent,
  type UiNodeSnapshot
} from "@unislang/unifold-events";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import type { DomRenderController } from "@unislang/unifold-renderer-dom";
import { UnifoldRuntime } from "@unislang/unifold-runtime";
import {
  createMachineCommandRegistry,
  type UiMachineCommandRegistry
} from "@unislang/unifold-xstate";
import type { Subscription } from "rxjs";

import { prepareUnifoldDocument } from "./compiler.js";
import { createApplicationSnapshots } from "./application-snapshots.js";
import { commandForEvent, eventExecutionContext } from "./event-command.js";
import { UiMachineCoordinator } from "./machine-coordinator.js";
import {
  UiSemanticConfigurationError,
  UiSemanticCoordinator,
  semanticSnapshotRecord
} from "./semantic-coordinator.js";
import { prepareApplicationStores, type PreparedApplicationStores } from "./store-adapters.js";
import type { StoreCommandController } from "./store-command-port.js";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationUpdateStatus,
  UnifoldPreparationStatus,
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
  private updating = false;

  constructor(
    prepared: PreparedUnifoldDocument,
    private readonly container: HTMLElement,
    runtime: UnifoldRuntime,
    renderer: DomRenderController,
    stores: PreparedApplicationStores,
    private readonly storeAdapters: UiStoreAdapterRegistry,
    machineCommands: UiMachineCommandRegistry = createMachineCommandRegistry(),
    private readonly storeCommands?: StoreCommandController,
    private readonly semantics?: UiSemanticCoordinator
  ) {
    this.current = prepared;
    this.stores = stores;
    this.runtime = runtime;
    this.renderer = renderer;
    this.machines = new UiMachineCoordinator(runtime, machineCommands);
    this.machines.validate(prepared.document.machines);
    this.container.addEventListener(ElementEventName.UiEvent, this.onElementEvent);
    this.subscription = runtime.events$.subscribe(this.onRuntimeEvent);
    this.projectAll(this.current.document);
    this.machines.replace(prepared.document.machines);
  }

  get document(): UnifoldIrDocument {
    return this.current.document;
  }

  get authored(): unknown {
    return structuredClone(this.current.authored);
  }

  update(authored: unknown): UnifoldApplicationUpdateResult {
    const preparation = prepareUnifoldDocument(authored);
    if (preparation.status === UnifoldPreparationStatus.Invalid) {
      return rejectedUpdate(this.runtime.revision, preparation.diagnostics);
    }
    return this.applyPrepared(requirePrepared(preparation.prepared));
  }

  machineState(id: string) {
    return this.machines.state(id);
  }

  dispose(): void {
    this.container.removeEventListener(ElementEventName.UiEvent, this.onElementEvent);
    this.subscription.unsubscribe();
    this.renderer.dispose();
    this.semantics?.dispose();
    this.machines.dispose();
    this.runtime.dispose();
  }

  private applyPrepared(next: PreparedUnifoldDocument): UnifoldApplicationUpdateResult {
    const stores = this.prepareStores(next.document);
    if (stores instanceof Error) {
      return rejectedUpdate(this.runtime.revision, [
        errorDiagnostic(stores, UnifoldApplicationDiagnosticStage.Store)
      ]);
    }
    const diagnostic = this.preflightDiagnostic(next.document, stores);
    if (diagnostic !== undefined) return rejectedUpdate(this.runtime.revision, [diagnostic]);
    return this.commitPrepared(next, stores);
  }

  private prepareStores(document: UnifoldIrDocument): PreparedApplicationStores | Error {
    try {
      return prepareApplicationStores(document, this.storeAdapters);
    } catch (error) {
      return error instanceof Error ? error : new Error("Unknown store preparation failure.");
    }
  }

  private preflightDiagnostic(document: UnifoldIrDocument, stores: PreparedApplicationStores) {
    const mismatch = identityDiagnostic(this.current.document, document);
    if (mismatch !== undefined) return mismatch;
    return this.configurationDiagnostic(document, stores);
  }

  private configurationDiagnostic(document: UnifoldIrDocument, stores: PreparedApplicationStores) {
    return (
      this.validateMachines(document) ??
      this.rendererDiagnostic(document) ??
      this.semanticDiagnostic(document, stores)
    );
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
    nextStores: PreparedApplicationStores
  ): UnifoldApplicationUpdateResult {
    const previous = this.current;
    const previousStores = this.stores;
    const previousRevision = this.runtime.revision;
    this.current = next;
    this.stores = nextStores;
    this.runtime.replaceStoreBindings(nextStores.bindings);
    this.storeCommands?.replace(next.document, nextStores);
    this.updating = true;
    try {
      const nodes = createApplicationSnapshots(next.document, this.runtime.revision, nextStores);
      this.runtime.replaceRules(next.document.rules, nodes);
      this.runtime.execute([reconcileCommand(next.document, nodes)]);
    } catch (error) {
      this.restoreRuntime(previous, previousStores, previousRevision);
      this.updating = false;
      return rejectedUpdate(this.runtime.revision, [
        errorDiagnostic(error, UnifoldApplicationDiagnosticStage.Runtime)
      ]);
    }
    return this.commitRenderer(previous, previousStores, next);
  }

  private commitRenderer(
    previous: PreparedUnifoldDocument,
    previousStores: PreparedApplicationStores,
    next: PreparedUnifoldDocument
  ): UnifoldApplicationUpdateResult {
    try {
      this.renderer.update(next.document);
      this.projectAll(next.document);
      this.machines.replace(next.document.machines);
      this.semantics?.publishRuntime(next.document, this.runtime);
      return appliedUpdate(this.runtime.revision);
    } catch (error) {
      this.restore(previous, previousStores);
      return rejectedUpdate(this.runtime.revision, [
        errorDiagnostic(error, updateFailureStage(error))
      ]);
    } finally {
      this.updating = false;
    }
  }

  private restore(
    previous: PreparedUnifoldDocument,
    previousStores: PreparedApplicationStores
  ): void {
    this.current = previous;
    this.stores = previousStores;
    this.runtime.replaceStoreBindings(previousStores.bindings);
    this.storeCommands?.replace(previous.document, previousStores);
    const nodes = createApplicationSnapshots(
      previous.document,
      this.runtime.revision,
      previousStores
    );
    this.runtime.replaceRules(previous.document.rules, nodes);
    this.runtime.execute([reconcileCommand(previous.document, nodes)]);
    this.renderer.update(previous.document);
    this.projectAll(previous.document);
    this.machines.replace(previous.document.machines);
    this.semantics?.publishRuntime(previous.document, this.runtime);
  }

  private restoreRuntime(
    previous: PreparedUnifoldDocument,
    previousStores: PreparedApplicationStores,
    previousRevision: number
  ): void {
    this.current = previous;
    this.stores = previousStores;
    this.runtime.replaceStoreBindings(previousStores.bindings);
    this.storeCommands?.replace(previous.document, previousStores);
    const nodes = createApplicationSnapshots(
      previous.document,
      this.runtime.revision,
      previousStores
    );
    this.runtime.replaceRules(previous.document.rules, nodes);
    if (this.runtime.revision === previousRevision) return;
    this.runtime.execute([reconcileCommand(previous.document, nodes)]);
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

function reconcileCommand(
  document: UnifoldIrDocument,
  nodes: readonly UiNodeSnapshot[]
): StructureReconcileCommand {
  return {
    compositionInstances: document.compositionsByInstanceId,
    nodeIdentityAliases: document.nodeIdentityAliases,
    nodes,
    type: UiCommandType.StructureReconcile
  };
}

function identityDiagnostic(
  current: UnifoldIrDocument,
  next: UnifoldIrDocument
): UnifoldApplicationDiagnostic | undefined {
  if (current.documentId === next.documentId) return undefined;
  return {
    code: "document-id-changed",
    message: "An application update cannot change the document ID.",
    path: "/id",
    stage: UnifoldApplicationDiagnosticStage.Coordination
  };
}

function errorDiagnostic(
  error: unknown,
  stage: UnifoldApplicationDiagnosticStage
): UnifoldApplicationDiagnostic {
  return {
    code: "application-update-failed",
    message: error instanceof Error ? error.message : "Unknown application update failure.",
    path: "/",
    stage
  };
}

function updateFailureStage(error: unknown): UnifoldApplicationDiagnosticStage {
  return error instanceof UiSemanticConfigurationError
    ? UnifoldApplicationDiagnosticStage.Semantics
    : UnifoldApplicationDiagnosticStage.Renderer;
}

function requirePrepared(prepared: PreparedUnifoldDocument | undefined): PreparedUnifoldDocument {
  if (prepared === undefined) throw new Error("A valid preparation result has no document.");
  return prepared;
}

function appliedUpdate(revision: number): UnifoldApplicationUpdateResult {
  return { diagnostics: [], revision, status: UnifoldApplicationUpdateStatus.Applied };
}

function rejectedUpdate(
  revision: number,
  diagnostics: readonly UnifoldApplicationDiagnostic[]
): UnifoldApplicationUpdateResult {
  return { diagnostics, revision, status: UnifoldApplicationUpdateStatus.Rejected };
}
