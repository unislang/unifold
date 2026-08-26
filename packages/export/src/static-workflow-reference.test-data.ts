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

function workflowSteps(): readonly JsonObject[] {
  return [
    { id: "details", label: "Details" },
    { id: "review", label: "Review" }
  ];
}
