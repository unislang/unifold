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
  const { menuSelection, popoverSelection, stepperSelection, tabSelection, wizardSelection } =
    selections;
  const maximumRenderedButtons = Math.max(
    ...interactions.map(({ renderedButtons }) => renderedButtons)
  );
  return {
    gates: workflowGates(startup, selections, maximumRenderedButtons, interactions, options),
    maximumRenderedButtons,
    menuSelection,
    popoverSelection,
    sampleCount: options.sampleCount,
    startup,
    stepCount: options.stepCount,
    stepperSelection,
    tabSelection,
    wizardSelection
  };
}

function selectionStatistics(interactions: readonly WorkflowInteraction[]) {
  return {
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
    interaction.stepperValue === "step-099",
    interaction.tabValue === "tab-099",
    interaction.wizardValue === "step-099",
    interaction.visiblePanels === 1,
    interaction.visibleTabPanels === 1,
    interaction.menuItemId === "item-099",
    interaction.menuTriggerFocused,
    interaction.popoverFocused,
    interaction.popoverOpen
  ].every(Boolean);
}

function interactionGates(selections: ReturnType<typeof selectionStatistics>, exact: boolean) {
  const { menuSelection, popoverSelection, stepperSelection, tabSelection, wizardSelection } =
    selections;
  return [
    interactionGate(
      "100-step Stepper selection",
      stepperSelection.p95Milliseconds,
      "step-099",
      exact
    ),
    interactionGate(
      "100-panel Wizard selection",
      wizardSelection.p95Milliseconds,
      "step-099",
      exact
    ),
    interactionGate("100-panel Tabs selection", tabSelection.p95Milliseconds, "tab-099", exact),
    interactionGate(
      "100-item MenuButton activation",
      menuSelection.p95Milliseconds,
      "item-099",
      exact
    ),
    interactionGate("32-action Popover opening", popoverSelection.p95Milliseconds, "open", exact)
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
