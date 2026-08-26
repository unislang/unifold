import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import { stepperDescriptor, wizardDescriptor } from "./workflow-catalog.js";

it("defines Stepper and Wizard over one controlled step-navigation contract", () => {
  expect(stepperDescriptor).toMatchObject({
    componentType: CoreComponentType.Stepper,
    constraints: [{ childMode: "none", kind: CatalogConstraintKind.StepNavigationState }],
    tagName: CoreElementTag.Stepper
  });
  expect(wizardDescriptor).toMatchObject({
    componentType: CoreComponentType.Wizard,
    constraints: [{ childMode: "match-steps", kind: CatalogConstraintKind.StepNavigationState }],
    tagName: CoreElementTag.Wizard
  });
  expect(wizardDescriptor.properties).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "steps",
        required: true,
        valueType: CatalogPropertyType.StepList
      }),
      expect.objectContaining({
        name: "value",
        required: true,
        valueType: CatalogPropertyType.StepId
      })
    ])
  );
});
