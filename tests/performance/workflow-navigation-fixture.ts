import {
  CoreCatalogName,
  CoreCatalogVersion,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  type JsonObject
} from "@unislang/unifold-contracts";
import type { UnifoldStepper, UnifoldTabs, UnifoldWizard } from "@unislang/unifold-elements";
import {
  mountUnifoldApplication,
  UnifoldApplicationMountStatus,
  type UnifoldApplicationPort
} from "@unislang/unifold";

import { percentile } from "./profile-statistics.js";

const WORKFLOW_STEP_COUNT = 100;
export const WORKFLOW_BUTTON_LIMIT = 300;
const STARTUP_P95_LIMIT_MILLISECONDS = 1_000;
const INTERACTION_P95_LIMIT_MILLISECONDS = 100;
const PROFILE_SAMPLES = 20;

interface MountedWorkflow {
  readonly application: UnifoldApplicationPort;
  readonly container: HTMLElement;
  readonly stepper: UnifoldStepper;
  readonly tabs: UnifoldTabs;
  readonly wizard: UnifoldWizard;
}

interface WorkflowInteraction {
  readonly renderedButtons: number;
  readonly stepperMilliseconds: number;
  readonly stepperValue: string;
  readonly tabMilliseconds: number;
  readonly tabValue: string;
  readonly visibleTabPanels: number;
  readonly visiblePanels: number;
  readonly wizardMilliseconds: number;
  readonly wizardValue: string;
}

export async function measureWorkflowNavigationPerformance() {
  disposeWorkflow(await mountWorkflow());
  const startupSamples: number[] = [];
  const interactions: WorkflowInteraction[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    const mounted = await mountWorkflow();
    startupSamples.push(performance.now() - started);
    interactions.push(await exerciseWorkflow(mounted));
    disposeWorkflow(mounted);
  }
  return performanceEvidence(startupSamples, interactions);
}

export async function mountWorkflow(): Promise<MountedWorkflow> {
  const container = document.createElement("main");
  document.body.append(container);
  const mounted = mountUnifoldApplication(workflowDocument(), container);
  if (mounted.status !== UnifoldApplicationMountStatus.Mounted) {
    container.remove();
    throw new Error(`Workflow mount failed: ${JSON.stringify(mounted.diagnostics)}`);
  }
  const stepper = requireElement<UnifoldStepper>(container, "unifold-stepper");
  const tabs = requireElement<UnifoldTabs>(container, "unifold-tabs");
  const wizard = requireElement<UnifoldWizard>(container, "unifold-wizard");
  await Promise.all([stepper.updateComplete, tabs.updateComplete, wizard.updateComplete]);
  return { application: mounted.application, container, stepper, tabs, wizard };
}

export async function exerciseWorkflow(mounted: MountedWorkflow): Promise<WorkflowInteraction> {
  const { stepper, tabs, wizard } = mounted;
  const target = WORKFLOW_STEP_COUNT - 1;
  const stepperStarted = performance.now();
  button(stepper, target).click();
  await stepper.updateComplete;
  const stepperMilliseconds = performance.now() - stepperStarted;
  const wizardStarted = performance.now();
  button(wizard, target).click();
  await wizard.updateComplete;
  const wizardMilliseconds = performance.now() - wizardStarted;
  const tabStarted = performance.now();
  tabButton(tabs, target).click();
  await tabs.updateComplete;
  return {
    renderedButtons: buttonCount(stepper) + buttonCount(wizard) + tabButtonCount(tabs),
    stepperMilliseconds,
    stepperValue: stepper.value,
    tabMilliseconds: performance.now() - tabStarted,
    tabValue: tabs.value,
    visibleTabPanels: visibleTabPanelCount(tabs),
    visiblePanels: [...wizard.children].filter((child) => !child.hasAttribute("hidden")).length,
    wizardMilliseconds,
    wizardValue: wizard.value
  };
}

export function disposeWorkflow(mounted: MountedWorkflow): void {
  mounted.application.dispose();
  mounted.container.remove();
}

function workflowDocument(): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [],
    id: "workflow-performance",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view: workflowView()
  };
}

function workflowView(): JsonObject {
  return {
    $comp: "Stack",
    $children: [stepperNode(), wizardNode(), tabsNode()],
    id: "workflow-root",
    label: "Workflow navigation"
  };
}

function stepperNode(): JsonObject {
  return {
    $comp: "Stepper",
    id: "workflow-stepper",
    label: "Workflow progress",
    steps: steps(),
    value: "step-000"
  };
}

function wizardNode(): JsonObject {
  return {
    $comp: "Wizard",
    $children: Array.from({ length: WORKFLOW_STEP_COUNT }, (_, index) => ({
      $comp: "Text",
      content: `Panel ${index}`,
      id: `panel-${String(index).padStart(3, "0")}`
    })),
    id: "workflow-wizard",
    label: "Workflow wizard",
    linear: false,
    steps: steps(),
    value: "step-000"
  };
}

function tabsNode(): JsonObject {
  return {
    $comp: "Tabs",
    $children: Array.from({ length: WORKFLOW_STEP_COUNT }, (_, index) => ({
      $comp: "Text",
      content: `Tab panel ${index}`,
      id: `tab-panel-${String(index).padStart(3, "0")}`
    })),
    id: "workflow-tabs",
    label: "Workflow tabs",
    tabs: tabItems(),
    value: "tab-000"
  };
}

function steps(): readonly JsonObject[] {
  return Array.from({ length: WORKFLOW_STEP_COUNT }, (_, index) => ({
    description: `Description ${index}`,
    id: `step-${String(index).padStart(3, "0")}`,
    label: `Step ${index}`
  }));
}

function tabItems(): readonly JsonObject[] {
  return Array.from({ length: WORKFLOW_STEP_COUNT }, (_, index) => ({
    id: `tab-${String(index).padStart(3, "0")}`,
    label: `Tab ${index}`
  }));
}

function performanceEvidence(
  startupSamples: readonly number[],
  interactions: readonly WorkflowInteraction[]
) {
  const startup = statistics(startupSamples);
  const { stepperSelection, tabSelection, wizardSelection } = selectionStatistics(interactions);
  const maximumRenderedButtons = Math.max(
    ...interactions.map(({ renderedButtons }) => renderedButtons)
  );
  const exact = interactions.every(isExactInteraction);
  return {
    gates: workflowGates(
      startup,
      stepperSelection,
      wizardSelection,
      tabSelection,
      maximumRenderedButtons,
      exact
    ),
    maximumRenderedButtons,
    sampleCount: PROFILE_SAMPLES,
    startup,
    stepCount: WORKFLOW_STEP_COUNT,
    stepperSelection,
    tabSelection,
    wizardSelection
  };
}

function selectionStatistics(interactions: readonly WorkflowInteraction[]) {
  return {
    stepperSelection: statistics(
      interactions.map(({ stepperMilliseconds }) => stepperMilliseconds)
    ),
    tabSelection: statistics(interactions.map(({ tabMilliseconds }) => tabMilliseconds)),
    wizardSelection: statistics(interactions.map(({ wizardMilliseconds }) => wizardMilliseconds))
  };
}

function isExactInteraction(interaction: WorkflowInteraction): boolean {
  return (
    [
      interaction.stepperValue,
      interaction.tabValue,
      interaction.wizardValue,
      interaction.visiblePanels,
      interaction.visibleTabPanels
    ].join("|") === "step-099|tab-099|step-099|1|1"
  );
}

function workflowGates(
  startup: ReturnType<typeof statistics>,
  stepper: ReturnType<typeof statistics>,
  wizard: ReturnType<typeof statistics>,
  tabs: ReturnType<typeof statistics>,
  buttons: number,
  exact: boolean
) {
  return [
    {
      actualP95Milliseconds: startup.p95Milliseconds,
      actualRenderedButtons: buttons,
      limitP95Milliseconds: STARTUP_P95_LIMIT_MILLISECONDS,
      name: "100-step workflow startup",
      passed:
        startup.p95Milliseconds <= STARTUP_P95_LIMIT_MILLISECONDS &&
        buttons <= WORKFLOW_BUTTON_LIMIT,
      renderedButtonLimit: WORKFLOW_BUTTON_LIMIT
    },
    interactionGate("100-step Stepper selection", stepper.p95Milliseconds, "step-099", exact),
    interactionGate("100-panel Wizard selection", wizard.p95Milliseconds, "step-099", exact),
    interactionGate("100-panel Tabs selection", tabs.p95Milliseconds, "tab-099", exact)
  ];
}

function interactionGate(
  name: string,
  actualP95Milliseconds: number,
  requiredSelectedStepId: string,
  exact: boolean
) {
  return {
    actualP95Milliseconds,
    limitP95Milliseconds: INTERACTION_P95_LIMIT_MILLISECONDS,
    name,
    passed: actualP95Milliseconds <= INTERACTION_P95_LIMIT_MILLISECONDS && exact,
    requiredSelectedStepId
  };
}

function statistics(samples: readonly number[]) {
  return {
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds: percentile(samples, 0.95),
    p99Milliseconds: percentile(samples, 0.99)
  };
}

function requireElement<T extends Element>(container: ParentNode, selector: string): T {
  const element = container.querySelector<T>(selector);
  if (element === null) throw new Error(`Mounted ${selector} is missing.`);
  return element;
}

function button(element: UnifoldStepper, index: number): HTMLButtonElement {
  return requireElement<HTMLButtonElement>(
    element.shadowRoot as ShadowRoot,
    `[data-step-index="${index}"]`
  );
}

function buttonCount(element: UnifoldStepper): number {
  return element.shadowRoot?.querySelectorAll("[data-step-index]").length ?? 0;
}

function tabButton(element: UnifoldTabs, index: number): HTMLButtonElement {
  return requireElement<HTMLButtonElement>(
    element.shadowRoot as ShadowRoot,
    `[data-tab-index="${index}"]`
  );
}

function tabButtonCount(element: UnifoldTabs): number {
  return element.shadowRoot?.querySelectorAll("[data-tab-index]").length ?? 0;
}

function visibleTabPanelCount(element: UnifoldTabs): number {
  return element.shadowRoot?.querySelectorAll('[role="tabpanel"]:not([hidden])').length ?? 0;
}
