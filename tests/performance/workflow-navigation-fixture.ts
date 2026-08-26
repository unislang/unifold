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
  UnifoldPopover,
  UnifoldStepper,
  UnifoldTabs,
  UnifoldWizard
} from "@unislang/unifold-elements";
import { defineUnifoldStepper } from "@unislang/unifold-elements/stepper";
import { defineUnifoldMenuButton } from "@unislang/unifold-elements/menu-button";
import { defineUnifoldTabs } from "@unislang/unifold-elements/tabs";
import { defineUnifoldWizard } from "@unislang/unifold-elements/wizard";
import { mountUnifoldApplication, UnifoldApplicationMountStatus } from "@unislang/unifold";

import type { MountedWorkflow, WorkflowInteraction } from "./workflow-navigation.types.js";
import { workflowPerformanceEvidence } from "./workflow-navigation-evidence.js";
import { measureMenuActivation, workflowMenuNode } from "./workflow-menu-fixture.js";
import {
  defineWorkflowPopover,
  measurePopoverOpening,
  workflowPopoverNode
} from "./workflow-popover-fixture.js";

const WORKFLOW_STEP_COUNT = 100;
export const WORKFLOW_BUTTON_LIMIT = 434;
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
  return workflowPerformanceEvidence(startupSamples, interactions, {
    buttonLimit: WORKFLOW_BUTTON_LIMIT,
    sampleCount: PROFILE_SAMPLES,
    stepCount: WORKFLOW_STEP_COUNT
  });
}
export async function mountWorkflow(): Promise<MountedWorkflow> {
  defineUnifoldMenuButton(customElements);
  defineWorkflowPopover();
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
  const popover = requireElement<UnifoldPopover>(container, "unifold-popover");
  const tabs = requireElement<UnifoldTabs>(container, "unifold-tabs");
  const wizard = requireElement<UnifoldWizard>(container, "unifold-wizard");
  await Promise.all([
    menu.updateComplete,
    popover.updateComplete,
    stepper.updateComplete,
    tabs.updateComplete,
    wizard.updateComplete
  ]);
  return { application: mounted.application, container, menu, popover, stepper, tabs, wizard };
}
export async function exerciseWorkflow(mounted: MountedWorkflow): Promise<WorkflowInteraction> {
  const { menu, popover, stepper, tabs, wizard } = mounted;
  const target = WORKFLOW_STEP_COUNT - 1;
  const stepperMilliseconds = await clickAndMeasure(stepper, button(stepper, target));
  const wizardMilliseconds = await clickAndMeasure(wizard, button(wizard, target));
  const tabMilliseconds = await clickAndMeasure(tabs, tabButton(tabs, target));
  const menuEvidence = await measureMenuActivation(menu, target);
  const popoverEvidence = await measurePopoverOpening(popover);
  return {
    menuItemId: menuEvidence.itemId,
    menuMilliseconds: menuEvidence.milliseconds,
    menuTriggerFocused: menuEvidence.triggerFocused,
    renderedButtons: renderedButtonCount(mounted, menuEvidence.renderedButtons),
    popoverFocused: popoverEvidence.focused,
    popoverMilliseconds: popoverEvidence.milliseconds,
    popoverOpen: popover.open,
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

function renderedButtonCount(mounted: MountedWorkflow, menuButtons: number): number {
  const { popover, stepper, tabs, wizard } = mounted;
  return (
    (stepper.shadowRoot as ShadowRoot).querySelectorAll("[data-step-index]").length +
    (wizard.shadowRoot as ShadowRoot).querySelectorAll("[data-step-index]").length +
    (tabs.shadowRoot as ShadowRoot).querySelectorAll("[data-tab-index]").length +
    menuButtons +
    popover.children.length +
    1
  );
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
    $children: [
      stepperNode(),
      wizardNode(),
      tabsNode(),
      workflowMenuNode(WORKFLOW_STEP_COUNT),
      workflowPopoverNode()
    ],
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
