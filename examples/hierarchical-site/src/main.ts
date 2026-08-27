import "@unislang/unifold-theme/tokens.css";
import {
  UnifoldApplicationMountStatus,
  createMachineCommandRegistry,
  createMachineGuardRegistry,
  mountUnifoldApplication,
  type UnifoldApplicationPort
} from "@unislang/unifold";
import { PaginationItemKind, type PaginationItem } from "@unislang/unifold-catalog";
import { UiCommandType, type UiEvent } from "@unislang/unifold-events";

import { resolveHierarchicalModuleArtifact } from "./module-reference.js";
import "./example.css";

export interface ExampleController {
  readonly application: UnifoldApplicationPort;
  readonly moduleIntegrity: string;
  dispose(): void;
}

export async function mountHierarchicalExample(
  container: HTMLElement,
  eventLog: HTMLElement,
  machineState: HTMLElement
): Promise<ExampleController> {
  const artifact = await resolveHierarchicalModuleArtifact();
  const result = mountUnifoldApplication(artifact.composedDocument, container, {
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
    moduleIntegrity: artifact.integrity,
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
  registry.register("dismiss-ready-toast", () => ({
    id: "profile-ready-toast",
    properties: { visible: false },
    type: UiCommandType.NodePatchProperties
  }));
  registry.register("focus-submit-action", () => ({
    id: "submit-contact",
    type: UiCommandType.FocusRequest
  }));
  registry.register("show-results-page-two", () => ({
    id: "results-pagination",
    properties: { items: resultsPageTwoItems() },
    type: UiCommandType.NodePatchProperties
  }));
  return registry;
}

function resultsPageTwoItems(): readonly PaginationItem[] {
  return [
    paginationItem("previous", "Previous", PaginationItemKind.Previous, "#results-page-1"),
    paginationItem("results-page-1", "1", PaginationItemKind.Page, "#results-page-1"),
    {
      ...paginationItem("results-page-2", "2", PaginationItemKind.Page, "#results-page-2"),
      current: true
    },
    paginationItem("more-results", "…", PaginationItemKind.Overflow),
    { ...paginationItem("next", "Next", PaginationItemKind.Next), disabled: true }
  ];
}

function paginationItem(
  id: string,
  label: string,
  kind: PaginationItemKind,
  href?: string
): PaginationItem {
  const item = { accessibleLabel: paginationLabel(id), id, kind, label };
  return href === undefined ? item : { ...item, href };
}

function paginationLabel(id: string): string {
  const labels: Readonly<Record<string, string>> = {
    "more-results": "More result pages",
    next: "Next results page",
    previous: "Previous results page",
    "results-page-1": "Go to results page 1",
    "results-page-2": "Current results page, page 2"
  };
  return labels[id] ?? id;
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
  const container = document.getElementById("app");
  const eventLog = document.querySelector<HTMLElement>("[data-testid='event-log']");
  const machineState = document.querySelector<HTMLElement>("[data-testid='machine-state']");
  const targets = exampleTargets(container, eventLog, machineState);
  if (targets === undefined) return;
  await registerHierarchicalOptionalElements();
  const controller = await mountHierarchicalExample(...targets);
  if (import.meta.env.MODE === "e2e") {
    document.documentElement.dataset["unifoldModuleIntegrity"] = controller.moduleIntegrity;
  }
}

export async function registerHierarchicalOptionalElements(): Promise<void> {
  defineHierarchicalOptionalElements(await loadHierarchicalOptionalElements());
}

function loadHierarchicalOptionalElements() {
  return Promise.all([
    import("@unislang/unifold/dialog"),
    import("@unislang/unifold/content-media"),
    import("@unislang/unifold/number-field"),
    import("@unislang/unifold/search-field"),
    import("@unislang/unifold/checkbox-group"),
    import("@unislang/unifold/switch"),
    import("@unislang/unifold/date-field"),
    import("@unislang/unifold/toast"),
    import("@unislang/unifold/pagination")
  ] as const);
}

function defineHierarchicalOptionalElements(
  families: Awaited<ReturnType<typeof loadHierarchicalOptionalElements>>
): void {
  const [
    dialog,
    contentMedia,
    numberField,
    searchField,
    checkboxGroup,
    switchFamily,
    dateField,
    toast,
    pagination
  ] = families;
  dialog.defineUnifoldDialog();
  contentMedia.defineUnifoldCard();
  contentMedia.defineUnifoldImage();
  numberField.defineUnifoldNumberField();
  searchField.defineUnifoldSearchField();
  checkboxGroup.defineUnifoldCheckboxGroup();
  switchFamily.defineUnifoldSwitch();
  dateField.defineUnifoldDateField();
  toast.defineUnifoldToast();
  pagination.defineUnifoldPagination();
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
