import { CoreComponentType } from "@unislang/unifold-contracts";

import { choiceConstraints, choiceProperties } from "./choice-catalog.js";
import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import type {
  CatalogConstraintDescriptor,
  CatalogPropertyDescriptor,
  ComponentDescriptor
} from "./types.js";

export const MAXIMUM_CHECKBOX_GROUP_OPTIONS = 100;

export const checkboxGroupDescriptor: ComponentDescriptor = Object.freeze({
  componentType: CoreComponentType.CheckboxGroup,
  constraints: [
    { kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 },
    ...choiceConstraints.map(disallowDisabledSelection)
  ] satisfies readonly CatalogConstraintDescriptor[],
  properties: Object.freeze(groupProperties()),
  tagName: CoreElementTag.CheckboxGroup,
  version: "1.0.0"
});

function groupProperties(): readonly CatalogPropertyDescriptor[] {
  return choiceProperties(CatalogPropertyType.StringArray, []).map(groupProperty);
}

function disallowDisabledSelection(
  constraint: CatalogConstraintDescriptor
): CatalogConstraintDescriptor {
  if (constraint.kind !== CatalogConstraintKind.SelectionInOptions) return constraint;
  return { ...constraint, allowDisabledSelection: false };
}

function groupProperty(property: CatalogPropertyDescriptor): CatalogPropertyDescriptor {
  if (property.name === "label") return requiredLabelProperty();
  if (property.name === "options") return requiredOptionsProperty();
  return property;
}

function requiredLabelProperty(): CatalogPropertyDescriptor {
  return {
    minimumLength: 1,
    name: "label",
    required: true,
    valueType: CatalogPropertyType.String
  };
}

function requiredOptionsProperty(): CatalogPropertyDescriptor {
  return {
    maximumItems: MAXIMUM_CHECKBOX_GROUP_OPTIONS,
    minimumItems: 1,
    name: "options",
    required: true,
    valueType: CatalogPropertyType.OptionList
  };
}
