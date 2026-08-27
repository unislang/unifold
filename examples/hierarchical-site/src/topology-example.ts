import {
  UnifoldApplicationMountStatus,
  mountUnifoldApplication,
  type UnifoldApplicationPort
} from "@unislang/unifold";
import type { UiCommand, UiEvent } from "@unislang/unifold-events";

import { resolveControlTopologyArtifact } from "./module-reference.js";

const FORM_ID = "topology-form";
const MACHINE_ID = "topology-workflow";

interface TopologyTestWindow extends Window {
  __unifoldCapturedEvents?: UiEvent[];
  __unifoldControlSnapshot?: (id: string) => unknown;
  __unifoldExecute?: (commands: readonly UiCommand[]) => unknown;
}

export interface TopologyExampleController {
  readonly application: UnifoldApplicationPort;
  readonly moduleIntegrity: string;
  dispose(): void;
}

export async function mountControlTopologyExample(
  container: HTMLElement,
  snapshotOutput: HTMLElement,
  machineOutput: HTMLElement
): Promise<TopologyExampleController> {
  await registerControlTopologyElements();
  const artifact = await resolveControlTopologyArtifact();
  const result = mountUnifoldApplication(artifact.composedDocument, container);
  if (result.status !== UnifoldApplicationMountStatus.Mounted) {
    throw new Error(`Topology example mount failed: ${JSON.stringify(result.diagnostics)}`);
  }
  const application = result.application;
  const subscription = application.runtime.events$.subscribe((event) => {
    captureEvent(event);
    queueViewUpdate(application, snapshotOutput, machineOutput);
  });
  showTopologyState(application, snapshotOutput, machineOutput);
  const removeReader = installSnapshotReader(application);
  const removeExecutor = installCommandExecutor(application);
  return topologyController(
    application,
    artifact.integrity,
    subscription,
    removeReader,
    removeExecutor
  );
}

function topologyController(
  application: UnifoldApplicationPort,
  moduleIntegrity: string,
  subscription: { unsubscribe(): void },
  removeReader: () => void,
  removeExecutor: () => void
): TopologyExampleController {
  return {
    application,
    moduleIntegrity,
    dispose: () =>
      dispose(
        application,
        subscription.unsubscribe.bind(subscription),
        removeReader,
        removeExecutor
      )
  };
}

export async function registerControlTopologyElements(): Promise<void> {
  const formStructure = await import("@unislang/unifold/form-structure");
  formStructure.defineUnifoldFieldset();
}

export async function bootstrapControlTopologyExample(): Promise<void> {
  const targets = topologyTargets();
  if (targets === undefined) return;
  const controller = await mountControlTopologyExample(...targets);
  if (import.meta.env.MODE === "e2e") {
    document.documentElement.dataset["unifoldTopologyIntegrity"] = controller.moduleIntegrity;
  }
}

function queueViewUpdate(
  application: UnifoldApplicationPort,
  snapshotOutput: HTMLElement,
  machineOutput: HTMLElement
): void {
  queueMicrotask(() => showTopologyState(application, snapshotOutput, machineOutput));
}

function showTopologyState(
  application: UnifoldApplicationPort,
  snapshotOutput: HTMLElement,
  machineOutput: HTMLElement
): void {
  const value = application.runtime.getSnapshot(FORM_ID).control?.value ?? null;
  snapshotOutput.textContent = JSON.stringify(value, null, 2);
  machineOutput.textContent = String(application.machineState(MACHINE_ID));
}

function installSnapshotReader(application: UnifoldApplicationPort): () => void {
  if (import.meta.env.MODE !== "e2e") return () => undefined;
  const target = window as TopologyTestWindow;
  target.__unifoldControlSnapshot = (id) => application.runtime.getSnapshot(id);
  return () => delete target.__unifoldControlSnapshot;
}

function installCommandExecutor(application: UnifoldApplicationPort): () => void {
  if (import.meta.env.MODE !== "e2e") return () => undefined;
  const target = window as TopologyTestWindow;
  target.__unifoldExecute = (commands) => application.runtime.execute(commands);
  return () => delete target.__unifoldExecute;
}

function captureEvent(event: UiEvent): void {
  const events = capturedEvents();
  if (events === undefined) return;
  if (events.some(({ id }) => id === event.id)) return;
  events.push(event);
}

function capturedEvents(): UiEvent[] | undefined {
  if (import.meta.env.MODE !== "e2e") return undefined;
  return (window as TopologyTestWindow).__unifoldCapturedEvents;
}

function topologyTargets(): readonly [HTMLElement, HTMLElement, HTMLElement] | undefined {
  const container = document.getElementById("topology-app");
  const snapshot = document.querySelector<HTMLElement>("[data-testid='topology-snapshot']");
  const machine = document.querySelector<HTMLElement>("[data-testid='topology-machine-state']");
  const values = [container, snapshot, machine];
  if (!values.every((value) => value instanceof HTMLElement)) return undefined;
  return values as [HTMLElement, HTMLElement, HTMLElement];
}

function dispose(
  application: UnifoldApplicationPort,
  unsubscribe: () => void,
  removeReader: () => void,
  removeExecutor: () => void
): void {
  unsubscribe();
  removeReader();
  removeExecutor();
  application.dispose();
}
