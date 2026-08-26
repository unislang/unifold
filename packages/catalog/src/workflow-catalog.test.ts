import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag,
  TabActivationMode
} from "./enums.js";
import { stepperDescriptor, tabsDescriptor, wizardDescriptor } from "./workflow-catalog.js";

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

it("defines Tabs over bounded exact items and controlled activation", () => {
  expect(tabsDescriptor).toMatchObject({
    componentType: CoreComponentType.Tabs,
    constraints: [
      { childMode: "match-steps", kind: CatalogConstraintKind.StepNavigationState, owner: "tabs" }
    ],
    tagName: CoreElementTag.Tabs
  });
  expect(tabsDescriptor.properties).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "tabs",
        required: true,
        valueType: CatalogPropertyType.StepList
      }),
      expect.objectContaining({
        defaultValue: TabActivationMode.Automatic,
        name: "activationMode",
        valueType: CatalogPropertyType.Enum
      })
    ])
  );
});
