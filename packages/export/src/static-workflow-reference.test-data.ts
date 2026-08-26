import type { JsonObject } from "@unislang/unifold-contracts";

export function referenceStepperNode(): JsonObject {
  return {
    $comp: "Stepper",
    id: "profile-progress",
    label: "Profile progress",
    steps: workflowSteps(),
    value: "details"
  };
}

export function referenceWizardNode(): JsonObject {
  return {
    $comp: "Wizard",
    $children: [
      { $comp: "Text", content: "Enter details", id: "details-panel" },
      { $comp: "Text", content: "Review details", id: "review-panel" }
    ],
    id: "profile-wizard",
    label: "Profile wizard",
    steps: workflowSteps(),
    value: "details"
  };
}

export function referenceTabsNode(): JsonObject {
  return {
    $comp: "Tabs",
    $children: [
      { $comp: "Text", content: "Profile summary", id: "summary-tab-panel" },
      { $comp: "Text", content: "Profile activity", id: "activity-tab-panel" }
    ],
    id: "profile-tabs",
    label: "Profile sections",
    tabs: [
      { id: "summary", label: "Summary" },
      { id: "activity", label: "Activity" }
    ],
    value: "summary"
  };
}

function workflowSteps(): readonly JsonObject[] {
  return [
    { id: "details", label: "Details" },
    { id: "review", label: "Review" }
  ];
}
