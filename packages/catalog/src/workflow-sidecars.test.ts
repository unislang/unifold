import { expect, it } from "vitest";

import { stepperSidecar, wizardSidecar } from "./workflow-sidecars.js";

it("publishes distinct executable Stepper and Wizard evidence", () => {
  expect(stepperSidecar.testManifest.browserScenarios).toEqual([
    "selects an accessible workflow step through canonical state"
  ]);
  expect(wizardSidecar.testManifest.browserScenarios).toEqual([
    "navigates a composed wizard through controlled JSON state"
  ]);
  expect(wizardSidecar.examples[0]?.view.$children).toHaveLength(2);
  expect(wizardSidecar.privacy.sensitiveProperties).toContain("steps");
});
