import { CoreComponentType, UiUpdateTrigger } from "@unislang/unifold-contracts";

import {
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag,
  StepperOrientation,
  TabActivationMode
} from "./enums.js";
import type { CatalogPropertyDescriptor, ComponentDescriptor } from "./types.js";
import {
  catalogEnumProperty as enumProperty,
  catalogProperty as property,
  catalogTestIdProperty as testId
} from "./catalog-properties.js";

function controlProperties(): readonly CatalogPropertyDescriptor[] {
  return [
    property("label", CatalogPropertyType.String, undefined, true),
    property("steps", CatalogPropertyType.StepList, undefined, true),
    property("value", CatalogPropertyType.StepId, undefined, true),
    property("disabled", CatalogPropertyType.Boolean, false),
    property("errorMessage", CatalogPropertyType.String, ""),
    property("name", CatalogPropertyType.String, ""),
    enumProperty("updateOn", UiUpdateTrigger.Input, Object.values(UiUpdateTrigger)),
    property("validators", CatalogPropertyType.StringArray, []),
    property("asyncValidators", CatalogPropertyType.StringArray, [])
  ];
}

export const stepperDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.Stepper,
  constraints: [
    {
      childMode: "none",
      kind: CatalogConstraintKind.StepNavigationState,
      owner: "stepper",
      stepsProperty: "steps",
      valueProperty: "value"
    }
  ],
  properties: [
    ...controlProperties(),
    enumProperty("orientation", StepperOrientation.Horizontal, Object.values(StepperOrientation)),
    testId
  ],
  tagName: CoreElementTag.Stepper,
  version: "1.0.0"
};

export const tabsDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.Tabs,
  constraints: [
    {
      childMode: "match-steps",
      kind: CatalogConstraintKind.StepNavigationState,
      owner: "tabs",
      stepsProperty: "tabs",
      valueProperty: "value"
    }
  ],
  properties: [
    ...controlProperties().map((descriptor) =>
      descriptor.name === "steps" ? { ...descriptor, name: "tabs" } : descriptor
    ),
    enumProperty("activationMode", TabActivationMode.Automatic, Object.values(TabActivationMode)),
    enumProperty("orientation", StepperOrientation.Horizontal, Object.values(StepperOrientation)),
    testId
  ],
  tagName: CoreElementTag.Tabs,
  version: "1.0.0"
};

export const wizardDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.Wizard,
  constraints: [
    {
      childMode: "match-steps",
      kind: CatalogConstraintKind.StepNavigationState,
      owner: "wizard",
      stepsProperty: "steps",
      valueProperty: "value"
    }
  ],
  properties: [
    ...controlProperties(),
    property("linear", CatalogPropertyType.Boolean, true),
    property("backLabel", CatalogPropertyType.String, "Back"),
    property("nextLabel", CatalogPropertyType.String, "Next"),
    property("completeLabel", CatalogPropertyType.String, "Complete"),
    enumProperty("orientation", StepperOrientation.Horizontal, Object.values(StepperOrientation)),
    testId
  ],
  tagName: CoreElementTag.Wizard,
  version: "1.0.0"
};
