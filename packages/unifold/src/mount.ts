import { registerApplicationElements } from "./element-registration.js";
import {
  captureStaticDomHydration,
  renderIrDocument,
  type DomRenderController,
  type StaticDomHydrationState
} from "@unislang/unifold-renderer-dom";
import { UnifoldRuntime } from "@unislang/unifold-runtime";
import { createMachineCommandRegistry } from "@unislang/unifold-xstate";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";

import { UnifoldApplication } from "./application.js";
import { createApplicationSnapshots } from "./application-snapshots.js";
import { prepareUnifoldDocument } from "./compiler.js";
import { UiMachineConfigurationError } from "./machine-coordinator.js";
import { UiSemanticConfigurationError, UiSemanticCoordinator } from "./semantic-coordinator.js";
import { captureStaticDomFallback, type StaticDomFallback } from "./static-fallback.js";
import {
  UiStoreConfigurationError,
  prepareApplicationStores,
  type PreparedApplicationStores
} from "./store-adapters.js";
import { createStoreCommandPort, type StoreCommandController } from "./store-command-port.js";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationMountMode,
  UnifoldSemanticPublicationMode,
  UnifoldApplicationMountStatus,
  UnifoldPreparationStatus,
  type MountUnifoldApplicationOptions,
  type MountUnifoldApplicationResult,
  type PreparedUnifoldDocument,
  type UnifoldApplicationDiagnostic
} from "./types.js";

export function mountUnifoldApplication(
  authored: unknown,
  container: HTMLElement,
  options: MountUnifoldApplicationOptions = {}
): MountUnifoldApplicationResult {
  const preparation = prepareUnifoldDocument(authored);
  if (preparation.status === UnifoldPreparationStatus.Invalid) {
    return { diagnostics: preparation.diagnostics, status: UnifoldApplicationMountStatus.Rejected };
  }
  return mountPreparedUnifoldApplication(requirePrepared(preparation.prepared), container, options);
}

export function mountPreparedUnifoldApplication(
  prepared: PreparedUnifoldDocument,
  container: HTMLElement,
  options: MountUnifoldApplicationOptions
): MountUnifoldApplicationResult {
  try {
    return mountPrepared(prepared, container, options);
  } catch (error) {
    return rejectedMount(errorDiagnostic(error, mountErrorStage(error)));
  }
}

export function mountPreparedUnifoldApplicationWithStores(
  prepared: PreparedUnifoldDocument,
  container: HTMLElement,
  options: MountUnifoldApplicationOptions,
  stores: PreparedApplicationStores,
  storeCommands: StoreCommandController
): MountUnifoldApplicationResult {
  try {
    const registration = registerApplicationElements(container);
    if (registration !== undefined) return registration;
    return mountConfigured(prepared, container, options, stores, storeCommands);
  } catch (error) {
    return rejectedMount(errorDiagnostic(error, mountErrorStage(error)));
  }
}

function mountPrepared(
  prepared: PreparedUnifoldDocument,
  container: HTMLElement,
  options: MountUnifoldApplicationOptions
): MountUnifoldApplicationResult {
  const registration = registerApplicationElements(container);
  if (registration !== undefined) return registration;
  return mountRegistered(prepared, container, options);
}

function mountRegistered(
  prepared: PreparedUnifoldDocument,
  container: HTMLElement,
  options: MountUnifoldApplicationOptions
): MountUnifoldApplicationResult {
  const stores = prepareApplicationStores(prepared.document, options.storeAdapters);
  const storeCommands = createStoreCommandPort(
    prepared.document,
    stores,
    storeAdapters(options),
    options.runtime?.commandPort
  );
  return mountConfigured(prepared, container, options, stores, storeCommands);
}

function mountConfigured(
  prepared: PreparedUnifoldDocument,
  container: HTMLElement,
  options: MountUnifoldApplicationOptions,
  stores: PreparedApplicationStores,
  storeCommands: StoreCommandController
): MountUnifoldApplicationResult {
  const hydration = captureHydration(prepared.document, container, options);
  const runtime = createRuntime(prepared.document, options, stores, storeCommands, hydration);
  try {
    return mountRuntime(prepared, container, runtime, stores, storeCommands, options, hydration);
  } catch (error) {
    runtime.dispose();
    throw error;
  }
}

function mountRuntime(
  prepared: PreparedUnifoldDocument,
  container: HTMLElement,
  runtime: UnifoldRuntime,
  stores: PreparedApplicationStores,
  storeCommands: StoreCommandController,
  options: MountUnifoldApplicationOptions,
  hydration: StaticDomHydrationState | undefined
): MountUnifoldApplicationResult {
  const fallback = captureMountFallback(container, options);
  const semantics = semanticCoordinator(container, prepared.document.documentId, options);
  try {
    semantics.validateRuntime(prepared.document, runtime);
    return mountValidatedRuntime(
      prepared,
      container,
      runtime,
      stores,
      storeCommands,
      semantics,
      options,
      hydration
    );
  } catch (error) {
    semantics.dispose();
    fallback?.restore();
    throw error;
  }
}

function mountValidatedRuntime(
  prepared: PreparedUnifoldDocument,
  container: HTMLElement,
  runtime: UnifoldRuntime,
  stores: PreparedApplicationStores,
  storeCommands: StoreCommandController,
  semantics: UiSemanticCoordinator,
  options: MountUnifoldApplicationOptions,
  hydration: StaticDomHydrationState | undefined
): MountUnifoldApplicationResult {
  const renderer = renderIrDocument(prepared.document, container, options.renderer);
  try {
    const application = createApplication(
      prepared,
      container,
      runtime,
      renderer,
      stores,
      storeCommands,
      semantics,
      options
    );
    restoreCapturedFocus(renderer, hydration);
    return { application, diagnostics: [], status: UnifoldApplicationMountStatus.Mounted };
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}

function createApplication(
  prepared: PreparedUnifoldDocument,
  container: HTMLElement,
  runtime: UnifoldRuntime,
  renderer: DomRenderController,
  stores: PreparedApplicationStores,
  storeCommands: StoreCommandController,
  semantics: UiSemanticCoordinator,
  options: MountUnifoldApplicationOptions
): UnifoldApplication {
  const application = new UnifoldApplication(
    prepared,
    container,
    runtime,
    renderer,
    stores,
    storeAdapters(options),
    machineCommands(options),
    storeCommands,
    semantics
  );
  try {
    semantics.publishRuntime(prepared.document, runtime);
    return application;
  } catch (error) {
    application.dispose();
    throw error;
  }
}

function storeAdapters(options: MountUnifoldApplicationOptions) {
  return options.storeAdapters ?? {};
}

function machineCommands(options: MountUnifoldApplicationOptions) {
  return options.machineCommands ?? createMachineCommandRegistry();
}

function createRuntime(
  document: UnifoldIrDocument,
  options: MountUnifoldApplicationOptions,
  stores: PreparedApplicationStores,
  storeCommands: StoreCommandController,
  hydration: StaticDomHydrationState | undefined
): UnifoldRuntime {
  return new UnifoldRuntime({
    ...options.runtime,
    commandPort: storeCommands,
    compositionInstances: document.compositionsByInstanceId,
    documentId: document.documentId,
    initialNodes: createApplicationSnapshots(document, 0, stores, hydration?.values),
    rules: document.rules,
    storeBindings: stores.bindings
  });
}

function captureHydration(
  document: UnifoldIrDocument,
  container: HTMLElement,
  options: MountUnifoldApplicationOptions
): StaticDomHydrationState | undefined {
  const mode = options.mountMode ?? UnifoldApplicationMountMode.Replace;
  if (mode === UnifoldApplicationMountMode.Replace) return undefined;
  return captureStaticDomHydration(document, container);
}

function captureMountFallback(
  container: HTMLElement,
  options: MountUnifoldApplicationOptions
): StaticDomFallback | undefined {
  const mode = options.mountMode ?? UnifoldApplicationMountMode.Replace;
  return mode === UnifoldApplicationMountMode.UpgradeStatic
    ? captureStaticDomFallback(container)
    : undefined;
}

function restoreCapturedFocus(
  renderer: DomRenderController,
  hydration: StaticDomHydrationState | undefined
): void {
  if (hydration?.focusedNodeId === undefined) return;
  void renderer.restoreFocus(hydration.focusedNodeId);
}

function mountErrorStage(error: unknown): UnifoldApplicationDiagnosticStage {
  if (error instanceof UiStoreConfigurationError) return UnifoldApplicationDiagnosticStage.Store;
  return secondaryMountErrorStage(error);
}

function secondaryMountErrorStage(error: unknown): UnifoldApplicationDiagnosticStage {
  if (error instanceof UiMachineConfigurationError)
    return UnifoldApplicationDiagnosticStage.Workflow;
  if (error instanceof UiSemanticConfigurationError)
    return UnifoldApplicationDiagnosticStage.Semantics;
  return UnifoldApplicationDiagnosticStage.Renderer;
}

function semanticCoordinator(
  container: HTMLElement,
  documentId: string,
  options: MountUnifoldApplicationOptions
): UiSemanticCoordinator {
  return new UiSemanticCoordinator(
    container.ownerDocument,
    options.semanticPublication ?? UnifoldSemanticPublicationMode.Automatic,
    staticSemanticOwner(documentId, options)
  );
}

function staticSemanticOwner(
  documentId: string,
  options: MountUnifoldApplicationOptions
): string | undefined {
  const mode = options.mountMode ?? UnifoldApplicationMountMode.Replace;
  return mode === UnifoldApplicationMountMode.UpgradeStatic ? documentId : undefined;
}

function errorDiagnostic(
  error: unknown,
  stage: UnifoldApplicationDiagnosticStage
): UnifoldApplicationDiagnostic {
  return {
    code: "application-mount-failed",
    message: error instanceof Error ? error.message : "Unknown application mount failure.",
    path: "/",
    stage
  };
}

function requirePrepared(prepared: PreparedUnifoldDocument | undefined): PreparedUnifoldDocument {
  if (prepared === undefined) throw new Error("A valid preparation result has no document.");
  return prepared;
}

function rejectedMount(diagnostic: UnifoldApplicationDiagnostic): MountUnifoldApplicationResult {
  return { diagnostics: [diagnostic], status: UnifoldApplicationMountStatus.Rejected };
}
