import {
  UiCommandType,
  type StructureReconcileCommand,
  type UiNodeSnapshot
} from "@unislang/unifold-events";
import type { UiCollectionReconcileMetadata } from "@unislang/unifold-events";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import type { DomRenderController } from "@unislang/unifold-renderer-dom";
import type { UiExecutionContext, UnifoldRuntime } from "@unislang/unifold-runtime";

import { prepareUnifoldDocument } from "./compiler.js";
import { registerApplicationElements } from "./element-registration.js";
import {
  planCompositionMigration,
  type UiCompositionMigrationPlan,
  type UiCompositionVersionMigration
} from "./composition-migrations.js";
import { semanticSnapshotRecord, UiSemanticConfigurationError } from "./semantic-coordinator.js";
import type { UiSemanticCoordinator } from "./semantic-coordinator.js";
import type { UiMachineCoordinator } from "./machine-coordinator.js";
import type { PreparedApplicationStores } from "./store-adapters.js";
import type { StoreCommandController } from "./store-command-port.js";
import { createApplicationSnapshots } from "./application-snapshots.js";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationUpdateStatus,
  type PreparedUnifoldDocument,
  type MountUnifoldApplicationOptions,
  type UnifoldApplicationDiagnostic,
  type UnifoldApplicationUpdateResult,
  type UnifoldPreparationOptions
} from "./types.js";

export function elementRegistrationDiagnostic(
  container: HTMLElement,
  document: UnifoldIrDocument,
  options: MountUnifoldApplicationOptions
): UnifoldApplicationDiagnostic | undefined {
  return registerApplicationElements(container, document, options.elementDefinitionPolicy)
    ?.diagnostics[0];
}

export function firstDiagnostic(
  diagnostics: readonly (UnifoldApplicationDiagnostic | undefined)[]
): UnifoldApplicationDiagnostic | undefined {
  return diagnostics.find((diagnostic) => diagnostic !== undefined);
}

export function machineConfigurationDiagnostic(
  machines: UiMachineCoordinator,
  document: UnifoldIrDocument
): UnifoldApplicationDiagnostic | undefined {
  try {
    machines.validate(document.machines);
    return undefined;
  } catch (error) {
    return errorDiagnostic(error, UnifoldApplicationDiagnosticStage.Workflow);
  }
}

export function rendererConfigurationDiagnostic(
  renderer: DomRenderController,
  document: UnifoldIrDocument
): UnifoldApplicationDiagnostic | undefined {
  try {
    renderer.validate(document);
    return undefined;
  } catch (error) {
    return errorDiagnostic(error, UnifoldApplicationDiagnosticStage.Renderer);
  }
}

export function semanticConfigurationDiagnostic(
  semantics: UiSemanticCoordinator | undefined,
  document: UnifoldIrDocument,
  stores: PreparedApplicationStores,
  revision: number
): UnifoldApplicationDiagnostic | undefined {
  try {
    const snapshots = createApplicationSnapshots(document, revision, stores);
    semantics?.validate(document, semanticSnapshotRecord(snapshots));
    return undefined;
  } catch (error) {
    return errorDiagnostic(error, UnifoldApplicationDiagnosticStage.Semantics);
  }
}

export function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unknown rollback failure.");
}

export function prepareApplicationUpdate(
  authored: unknown,
  options: UnifoldPreparationOptions | undefined
) {
  return prepareUnifoldDocument(authored, options ?? {});
}

export function reconcileCommand(
  document: UnifoldIrDocument,
  nodes: readonly UiNodeSnapshot[],
  migration?: UiCompositionMigrationPlan,
  collectionOperation?: UiCollectionReconcileMetadata
): StructureReconcileCommand {
  return {
    ...(collectionOperation === undefined ? {} : { collectionOperation }),
    compositionInstances: document.compositionsByInstanceId,
    nodeIdentityAliases: migrationAliases(document, migration),
    nodes,
    ...migrationResets(migration),
    type: UiCommandType.StructureReconcile
  };
}

export function executePreparedReconciliation(
  runtime: UnifoldRuntime,
  next: PreparedUnifoldDocument,
  stores: PreparedApplicationStores,
  migration: UiCompositionMigrationPlan,
  collection?: {
    readonly context: UiExecutionContext;
    readonly metadata: UiCollectionReconcileMetadata;
  }
): void {
  const { context, metadata } = collection ?? {};
  const nodes = createApplicationSnapshots(next.document, runtime.revision, stores);
  runtime.replaceRules(next.document.rules, nodes);
  runtime.execute([reconcileCommand(next.document, nodes, migration, metadata)], context);
}

function migrationAliases(
  document: UnifoldIrDocument,
  migration: UiCompositionMigrationPlan | undefined
): Readonly<Record<string, string>> {
  return migration === undefined ? document.nodeIdentityAliases : migration.nodeIdentityAliases;
}

function migrationResets(
  migration: UiCompositionMigrationPlan | undefined
): Pick<StructureReconcileCommand, "resetNodeIds"> | Record<string, never> {
  return migration === undefined ? {} : { resetNodeIds: migration.resetNodeIds };
}

export function reverseMigrationPlan(
  migration: UiCompositionMigrationPlan
): UiCompositionMigrationPlan {
  return {
    nodeIdentityAliases: Object.fromEntries(
      Object.entries(migration.nodeIdentityAliases).map(([target, source]) => [source, target])
    ),
    resetNodeIds: []
  };
}

export function prepareCompositionMigration(
  current: UnifoldIrDocument,
  next: UnifoldIrDocument,
  migrations: readonly UiCompositionVersionMigration[]
): UiCompositionMigrationPlan | UnifoldApplicationDiagnostic {
  const mismatch = identityDiagnostic(current, next);
  if (mismatch !== undefined) return mismatch;
  try {
    return planCompositionMigration(current, next, migrations);
  } catch (error) {
    return errorDiagnostic(error, UnifoldApplicationDiagnosticStage.Composition);
  }
}

export function isApplicationDiagnostic(
  value: UiCompositionMigrationPlan | UnifoldApplicationDiagnostic
): value is UnifoldApplicationDiagnostic {
  return "stage" in value;
}

export function unavailableDiagnostic(): UnifoldApplicationDiagnostic {
  return {
    code: "application-unavailable",
    message: "The application is disposed or quarantined.",
    path: "/",
    stage: UnifoldApplicationDiagnosticStage.Coordination
  };
}

function updateInProgressDiagnostic(): UnifoldApplicationDiagnostic {
  return {
    code: "application-update-in-progress",
    message: "A structural application update is already in progress.",
    path: "/",
    stage: UnifoldApplicationDiagnosticStage.Coordination
  };
}

export function structuralUpdateDiagnostic(
  unavailable: boolean,
  updating: boolean
): UnifoldApplicationDiagnostic | undefined {
  if (unavailable) return unavailableDiagnostic();
  if (updating) return updateInProgressDiagnostic();
  return undefined;
}

function rollbackFailureDiagnostic(): UnifoldApplicationDiagnostic {
  return {
    code: "application-update-rollback-failed",
    message: "The update rollback failed and the application was quarantined.",
    path: "/",
    stage: UnifoldApplicationDiagnosticStage.Coordination
  };
}

export function rollbackResultDiagnostic(
  rollbackError: Error | undefined,
  updateError: unknown,
  stage: UnifoldApplicationDiagnosticStage
): UnifoldApplicationDiagnostic {
  if (rollbackError !== undefined) return rollbackFailureDiagnostic();
  return errorDiagnostic(updateError, stage);
}

function captureRuntimeSnapshots(
  runtime: UnifoldRuntime,
  document: UnifoldIrDocument,
  renderer?: DomRenderController
): readonly UiNodeSnapshot[] {
  const snapshots = document.renderOrder.map((id) => runtime.getSnapshot(id));
  const focused = renderedFocusedNodeId(renderer, document);
  if (focused === undefined) return snapshots;
  return snapshots.map((snapshot) => ({
    ...snapshot,
    base: { ...snapshot.base, focused: snapshot.id === focused }
  }));
}

export interface ApplicationUpdateCheckpoint {
  readonly previous: PreparedUnifoldDocument;
  readonly previousNodes: readonly UiNodeSnapshot[];
  readonly previousRevision: number;
  readonly previousStores: PreparedApplicationStores;
}

export function captureApplicationUpdateCheckpoint(
  previous: PreparedUnifoldDocument,
  stores: PreparedApplicationStores,
  runtime: UnifoldRuntime,
  renderer: DomRenderController
): ApplicationUpdateCheckpoint {
  return {
    previous,
    previousNodes: captureRuntimeSnapshots(runtime, previous.document, renderer),
    previousRevision: runtime.revision,
    previousStores: stores
  };
}

function renderedFocusedNodeId(
  renderer: DomRenderController | undefined,
  document: UnifoldIrDocument
): string | undefined {
  if (renderer === undefined) return undefined;
  return [...document.renderOrder]
    .reverse()
    .find((id) => renderedNodeHasFocus(renderer.getElement(id)));
}

function renderedNodeHasFocus(element: HTMLElement | undefined): boolean {
  if (element === undefined) return false;
  return composedActiveElements(element.ownerDocument).some(
    (active) => active === element || element.contains(active)
  );
}

function composedActiveElements(document: Document): readonly Element[] {
  const active: Element[] = [];
  let current = document.activeElement;
  while (current !== null) {
    active.push(current);
    current = shadowActiveElement(current);
  }
  return active;
}

function shadowActiveElement(element: Element): Element | null {
  return element.shadowRoot?.activeElement ?? null;
}

export function replaceStoreCommands(
  controller: StoreCommandController | undefined,
  document: UnifoldIrDocument,
  stores: PreparedApplicationStores
): void {
  controller?.replace(document, stores);
}

export function publishRuntimeSemantics(
  semantics: UiSemanticCoordinator | undefined,
  document: UnifoldIrDocument,
  runtime: UnifoldRuntime
): void {
  semantics?.publishRuntime(document, runtime);
}

export function identityDiagnostic(
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

export function errorDiagnostic(
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

export function updateFailureStage(error: unknown): UnifoldApplicationDiagnosticStage {
  return error instanceof UiSemanticConfigurationError
    ? UnifoldApplicationDiagnosticStage.Semantics
    : UnifoldApplicationDiagnosticStage.Renderer;
}

export function requirePrepared(
  prepared: PreparedUnifoldDocument | undefined
): PreparedUnifoldDocument {
  if (prepared === undefined) throw new Error("A valid preparation result has no document.");
  return prepared;
}

export function appliedUpdate(revision: number): UnifoldApplicationUpdateResult {
  return { diagnostics: [], revision, status: UnifoldApplicationUpdateStatus.Applied };
}

export function rejectedUpdate(
  revision: number,
  diagnostics: readonly UnifoldApplicationDiagnostic[]
): UnifoldApplicationUpdateResult {
  return { diagnostics, revision, status: UnifoldApplicationUpdateStatus.Rejected };
}
