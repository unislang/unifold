import { summarizeSamples } from "./profile-statistics.js";
import type { WorkflowInteraction } from "./workflow-navigation.types.js";

const STARTUP_P95_LIMIT_MILLISECONDS = 1_000;
const INTERACTION_P95_LIMIT_MILLISECONDS = 100;

interface WorkflowEvidenceOptions {
  readonly buttonLimit: number;
  readonly sampleCount: number;
  readonly stepCount: number;
}

export function workflowPerformanceEvidence(
  startupSamples: readonly number[],
  interactions: readonly WorkflowInteraction[],
  options: WorkflowEvidenceOptions
) {
  const startup = summarizeSamples(startupSamples);
  const selections = selectionStatistics(interactions);
  const maximumRenderedButtons = Math.max(
    ...interactions.map(({ renderedButtons }) => renderedButtons)
  );
  return {
    gates: workflowGates(startup, selections, maximumRenderedButtons, interactions, options),
    breadcrumbSelection: selections.breadcrumbSelection,
    dialogSelection: selections.dialogSelection,
    maximumRenderedButtons,
    menuSelection: selections.menuSelection,
    popoverSelection: selections.popoverSelection,
    sampleCount: options.sampleCount,
    startup,
    stepCount: options.stepCount,
    stepperSelection: selections.stepperSelection,
    tabSelection: selections.tabSelection,
    wizardSelection: selections.wizardSelection
  };
}

function selectionStatistics(interactions: readonly WorkflowInteraction[]) {
  return {
    breadcrumbSelection: summarizeSamples(
      interactions.map(({ breadcrumbMilliseconds }) => breadcrumbMilliseconds)
    ),
    dialogSelection: summarizeSamples(
      interactions.map(({ dialogMilliseconds }) => dialogMilliseconds)
    ),
    menuSelection: summarizeSamples(interactions.map(({ menuMilliseconds }) => menuMilliseconds)),
    popoverSelection: summarizeSamples(
      interactions.map(({ popoverMilliseconds }) => popoverMilliseconds)
    ),
    stepperSelection: summarizeSamples(
      interactions.map(({ stepperMilliseconds }) => stepperMilliseconds)
    ),
    tabSelection: summarizeSamples(interactions.map(({ tabMilliseconds }) => tabMilliseconds)),
    wizardSelection: summarizeSamples(
      interactions.map(({ wizardMilliseconds }) => wizardMilliseconds)
    )
  };
}

function workflowGates(
  startup: ReturnType<typeof summarizeSamples>,
  selections: ReturnType<typeof selectionStatistics>,
  buttons: number,
  interactions: readonly WorkflowInteraction[],
  options: WorkflowEvidenceOptions
) {
  return [
    {
      actualP95Milliseconds: startup.p95Milliseconds,
      actualRenderedButtons: buttons,
      limitP95Milliseconds: STARTUP_P95_LIMIT_MILLISECONDS,
      name: "100-step workflow startup",
      passed:
        startup.p95Milliseconds <= STARTUP_P95_LIMIT_MILLISECONDS && buttons <= options.buttonLimit,
      renderedButtonLimit: options.buttonLimit
    },
    ...interactionGates(selections, interactions.every(isExactInteraction))
  ];
}

function isExactInteraction(interaction: WorkflowInteraction): boolean {
  return [
    interaction.breadcrumbItemId === "breadcrumb-30",
    interaction.breadcrumbRenderedItems === 32,
    interaction.stepperValue === "step-099",
    interaction.tabValue === "tab-099",
    interaction.wizardValue === "step-099",
    interaction.visiblePanels === 1,
    interaction.visibleTabPanels === 1,
    interaction.menuItemId === "item-099",
    interaction.menuTriggerFocused,
    interaction.dialogFocused,
    interaction.dialogOpen,
    interaction.popoverFocused,
    interaction.popoverOpen
  ].every(Boolean);
}

function interactionGates(selections: ReturnType<typeof selectionStatistics>, exact: boolean) {
  const {
    breadcrumbSelection,
    dialogSelection,
    menuSelection,
    popoverSelection,
    stepperSelection,
    tabSelection,
    wizardSelection
  } = selections;
  return [
    interactionGate(
      "32-position Breadcrumb activation",
      breadcrumbSelection.p95Milliseconds,
      "breadcrumb-30",
      exact
    ),
    ...stepNavigationGates(stepperSelection, wizardSelection, tabSelection, exact),
    interactionGate(
      "100-item MenuButton activation",
      menuSelection.p95Milliseconds,
      "item-099",
      exact
    ),
    interactionGate("32-action Popover opening", popoverSelection.p95Milliseconds, "open", exact),
    interactionGate("32-action Dialog opening", dialogSelection.p95Milliseconds, "open", exact)
  ];
}

function stepNavigationGates(
  stepper: ReturnType<typeof summarizeSamples>,
  wizard: ReturnType<typeof summarizeSamples>,
  tabs: ReturnType<typeof summarizeSamples>,
  exact: boolean
) {
  return [
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
