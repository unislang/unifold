import { expect, it } from "vitest";

import { workflowPerformanceEvidence } from "./workflow-navigation-evidence.js";
import type { WorkflowInteraction } from "./workflow-navigation.types.js";

it("requires exact Popover and Dialog focus and open evidence", () => {
  const interaction = exactInteraction();
  const accepted = workflowPerformanceEvidence([1], [interaction], options());
  expect(accepted.gates).toHaveLength(8);
  expect(accepted.gates.every(({ passed }) => passed)).toBe(true);
  const rejected = workflowPerformanceEvidence(
    [1],
    [{ ...interaction, popoverFocused: false }],
    options()
  );
  expect(rejected.gates.at(-1)?.passed).toBe(false);
  expect(
    workflowPerformanceEvidence(
      [1],
      [{ ...interaction, dialogFocused: false }],
      options()
    ).gates.at(-1)?.passed
  ).toBe(false);
});

function exactInteraction(): WorkflowInteraction {
  return {
    breadcrumbItemId: "breadcrumb-30",
    breadcrumbMilliseconds: 1,
    breadcrumbRenderedItems: 32,
    dialogFocused: true,
    dialogMilliseconds: 1,
    dialogOpen: true,
    menuItemId: "item-099",
    menuMilliseconds: 1,
    menuTriggerFocused: true,
    popoverFocused: true,
    popoverMilliseconds: 1,
    popoverOpen: true,
    renderedButtons: 468,
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
  return { buttonLimit: 468, sampleCount: 1, stepCount: 100 };
}
