import { expect, it } from "vitest";

import { workflowPerformanceEvidence } from "./workflow-navigation-evidence.js";
import type { WorkflowInteraction } from "./workflow-navigation.types.js";

it("requires exact Popover focus and open evidence", () => {
  const interaction = exactInteraction();
  const accepted = workflowPerformanceEvidence([1], [interaction], options());
  expect(accepted.gates).toHaveLength(6);
  expect(accepted.gates.every(({ passed }) => passed)).toBe(true);
  const rejected = workflowPerformanceEvidence(
    [1],
    [{ ...interaction, popoverFocused: false }],
    options()
  );
  expect(rejected.gates.at(-1)?.passed).toBe(false);
});

function exactInteraction(): WorkflowInteraction {
  return {
    menuItemId: "item-099",
    menuMilliseconds: 1,
    menuTriggerFocused: true,
    popoverFocused: true,
    popoverMilliseconds: 1,
    popoverOpen: true,
    renderedButtons: 434,
    stepperMilliseconds: 1,
    stepperValue: "step-099",
    tabMilliseconds: 1,
    tabValue: "tab-099",
    visiblePanels: 1,
    visibleTabPanels: 1,
    wizardMilliseconds: 1,
    wizardValue: "step-099"
  };
}

function options() {
  return { buttonLimit: 434, sampleCount: 1, stepCount: 100 };
}
