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
import type {
  UnifoldMenuButton,
  UnifoldStepper,
  UnifoldTabs,
  UnifoldWizard
} from "@unislang/unifold-elements";
import { defineUnifoldStepper } from "@unislang/unifold-elements/stepper";
import { defineUnifoldMenuButton } from "@unislang/unifold-elements/menu-button";
import { defineUnifoldTabs } from "@unislang/unifold-elements/tabs";
import { defineUnifoldWizard } from "@unislang/unifold-elements/wizard";
import { mountUnifoldApplication, UnifoldApplicationMountStatus } from "@unislang/unifold";

import { percentile } from "./profile-statistics.js";
import type { MountedWorkflow, WorkflowInteraction } from "./workflow-navigation.types.js";
import { measureMenuActivation, workflowMenuNode } from "./workflow-menu-fixture.js";

const WORKFLOW_STEP_COUNT = 100;
export const WORKFLOW_BUTTON_LIMIT = 401;
const STARTUP_P95_LIMIT_MILLISECONDS = 1_000;
const INTERACTION_P95_LIMIT_MILLISECONDS = 100;
const PROFILE_SAMPLES = 20;

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
  defineUnifoldMenuButton(customElements);
  defineUnifoldStepper(customElements);
  defineUnifoldTabs(customElements);
  defineUnifoldWizard(customElements);
  const container = document.createElement("main");
  document.body.append(container);
  const mounted = mountUnifoldApplication(workflowDocument(), container);
  if (mounted.status !== UnifoldApplicationMountStatus.Mounted) {
    container.remove();
    throw new Error(`Workflow mount failed: ${JSON.stringify(mounted.diagnostics)}`);
  }
  const stepper = requireElement<UnifoldStepper>(container, "unifold-stepper");
  const menu = requireElement<UnifoldMenuButton>(container, "unifold-menu-button");
  const tabs = requireElement<UnifoldTabs>(container, "unifold-tabs");
  const wizard = requireElement<UnifoldWizard>(container, "unifold-wizard");
  await Promise.all([
    menu.updateComplete,
    stepper.updateComplete,
    tabs.updateComplete,
    wizard.updateComplete
  ]);
  return { application: mounted.application, container, menu, stepper, tabs, wizard };
}

export async function exerciseWorkflow(mounted: MountedWorkflow): Promise<WorkflowInteraction> {
  const { menu, stepper, tabs, wizard } = mounted;
  const target = WORKFLOW_STEP_COUNT - 1;
  const stepperMilliseconds = await clickAndMeasure(stepper, button(stepper, target));
  const wizardMilliseconds = await clickAndMeasure(wizard, button(wizard, target));
  const tabMilliseconds = await clickAndMeasure(tabs, tabButton(tabs, target));
  const menuEvidence = await measureMenuActivation(menu, target);
  return {
    menuItemId: menuEvidence.itemId,
    menuMilliseconds: menuEvidence.milliseconds,
    menuTriggerFocused: menuEvidence.triggerFocused,
    renderedButtons:
      (stepper.shadowRoot as ShadowRoot).querySelectorAll("[data-step-index]").length +
      (wizard.shadowRoot as ShadowRoot).querySelectorAll("[data-step-index]").length +
      (tabs.shadowRoot as ShadowRoot).querySelectorAll("[data-tab-index]").length +
      menuEvidence.renderedButtons,
    stepperMilliseconds,
    stepperValue: stepper.value,
    tabMilliseconds,
    tabValue: tabs.value,
    visibleTabPanels: visibleTabPanelCount(tabs),
    visiblePanels: [...wizard.children].filter((child) => !child.hasAttribute("hidden")).length,
    wizardMilliseconds,
    wizardValue: wizard.value
  };
}

async function clickAndMeasure(
  element: UnifoldStepper | UnifoldTabs | UnifoldWizard,
  control: HTMLButtonElement
): Promise<number> {
  const started = performance.now();
  control.click();
  await element.updateComplete;
  return performance.now() - started;
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
    $children: [stepperNode(), wizardNode(), tabsNode(), workflowMenuNode(WORKFLOW_STEP_COUNT)],
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
  const { menuSelection, stepperSelection, tabSelection, wizardSelection } =
    selectionStatistics(interactions);
  const maximumRenderedButtons = Math.max(
    ...interactions.map(({ renderedButtons }) => renderedButtons)
  );
  return {
    gates: workflowGates(
      startup,
      stepperSelection,
      wizardSelection,
      tabSelection,
      menuSelection,
      maximumRenderedButtons,
      interactions.every(isExactInteraction)
    ),
    maximumRenderedButtons,
    sampleCount: PROFILE_SAMPLES,
    startup,
    stepCount: WORKFLOW_STEP_COUNT,
    menuSelection,
    stepperSelection,
    tabSelection,
    wizardSelection
  };
}

function selectionStatistics(interactions: readonly WorkflowInteraction[]) {
  return {
    menuSelection: statistics(interactions.map(({ menuMilliseconds }) => menuMilliseconds)),
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
    ].join("|") === "step-099|tab-099|step-099|1|1" &&
    interaction.menuItemId === "item-099" &&
    interaction.menuTriggerFocused
  );
}

function workflowGates(
  startup: ReturnType<typeof statistics>,
  stepper: ReturnType<typeof statistics>,
  wizard: ReturnType<typeof statistics>,
  tabs: ReturnType<typeof statistics>,
  menu: ReturnType<typeof statistics>,
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
    interactionGate("100-panel Tabs selection", tabs.p95Milliseconds, "tab-099", exact),
    interactionGate("100-item MenuButton activation", menu.p95Milliseconds, "item-099", exact)
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

function tabButton(element: UnifoldTabs, index: number): HTMLButtonElement {
  return requireElement<HTMLButtonElement>(
    element.shadowRoot as ShadowRoot,
    `[data-tab-index="${index}"]`
  );
}

function visibleTabPanelCount(element: UnifoldTabs): number {
  return element.shadowRoot?.querySelectorAll('[role="tabpanel"]:not([hidden])').length ?? 0;
}
