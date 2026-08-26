import "@unislang/unifold-theme/tokens.css";
import {
  UnifoldApplicationMountStatus,
  createMachineCommandRegistry,
  createMachineGuardRegistry,
  createTrustedLayoutDefinitionRegistry,
  mountUnifoldApplication,
  type UnifoldApplicationPort
} from "@unislang/unifold";
import { UiCommandType, type UiEvent } from "@unislang/unifold-events";

import definition from "./ui.json" with { type: "json" };
import layoutDefinitions from "./layouts.json" with { type: "json" };
import "./example.css";

const layoutRegistry = createTrustedLayoutDefinitionRegistry(layoutDefinitions);

export interface ExampleController {
  readonly application: UnifoldApplicationPort;
  dispose(): void;
}

export function mountHierarchicalExample(
  container: HTMLElement,
  eventLog: HTMLElement,
  machineState: HTMLElement
): ExampleController {
  const result = mountUnifoldApplication(definition, container, {
    layoutRegistry,
    machineCommands: exampleCommands(),
    machineGuards: exampleGuards()
  });
  if (result.status !== UnifoldApplicationMountStatus.Mounted) {
    throw new Error(`Example mount failed: ${JSON.stringify(result.diagnostics)}`);
  }
  const application = result.application;
  const subscription = application.runtime.events$.subscribe((event) => {
    showEvent(event, eventLog);
    queueMachineState(application, machineState);
    captureEvent(event);
  });
  machineState.textContent = String(application.machineState("contact-workflow"));
  return {
    application,
    dispose: () => disposeExample(application, () => subscription.unsubscribe())
  };
}

function queueMachineState(application: UnifoldApplicationPort, target: HTMLElement): void {
  queueMicrotask(() => {
    target.textContent = String(application.machineState("contact-workflow"));
  });
}

function exampleCommands() {
  const registry = createMachineCommandRegistry();
  registry.register("show-summary-created", () => ({
    id: "summary-status",
    properties: { content: "Summary created" },
    type: UiCommandType.NodePatchProperties
  }));
  return registry;
}

function exampleGuards() {
  const registry = createMachineGuardRegistry();
  registry.register("consent-granted", ({ snapshot }) => {
    return snapshot("contact-consent")?.control?.value === true;
  });
  return registry;
}

function showEvent(event: UiEvent, target: HTMLElement): void {
  target.textContent = JSON.stringify(event, null, 2);
}

function captureEvent(event: UiEvent): void {
  if (import.meta.env.MODE !== "e2e") return;
  const target = window as unknown as { __unifoldCapturedEvents?: UiEvent[] };
  target.__unifoldCapturedEvents?.push(event);
}

function disposeExample(application: UnifoldApplicationPort, unsubscribe: () => void): void {
  unsubscribe();
  application.dispose();
}

async function bootstrap(): Promise<void> {
  const [dialog, contentMedia] = await Promise.all([
    import("@unislang/unifold/dialog"),
    import("@unislang/unifold/content-media")
  ]);
  dialog.defineUnifoldDialog();
  contentMedia.defineUnifoldCard();
  contentMedia.defineUnifoldImage();
  const container = document.getElementById("app");
  const eventLog = document.querySelector<HTMLElement>("[data-testid='event-log']");
  const machineState = document.querySelector<HTMLElement>("[data-testid='machine-state']");
  const targets = exampleTargets(container, eventLog, machineState);
  if (targets === undefined) return;
  mountHierarchicalExample(...targets);
}

function exampleTargets(
  container: HTMLElement | null,
  eventLog: HTMLElement | null,
  machineState: HTMLElement | null
): readonly [HTMLElement, HTMLElement, HTMLElement] | undefined {
  const values = [container, eventLog, machineState];
  if (!values.every((value) => value instanceof HTMLElement)) return undefined;
  return values as [HTMLElement, HTMLElement, HTMLElement];
}

void bootstrap();
