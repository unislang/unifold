import { CoreComponentType, UiUpdateTrigger } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { dateFieldDescriptor } from "./date-field-catalog.js";
import {
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag,
  DateFieldAutocomplete
} from "./enums.js";

it("publishes an exact canonical date control contract", () => {
  expect(dateFieldDescriptor).toMatchObject({
    componentType: CoreComponentType.DateField,
    tagName: CoreElementTag.DateField
  });
  expect(property("label")).toMatchObject({ minimumLength: 1, required: true });
  expect(property("value")).toMatchObject({
    defaultValue: "",
    valueType: CatalogPropertyType.Date
  });
  expect(property("step")).toMatchObject({
    defaultValue: 1,
    valueType: CatalogPropertyType.PositiveInteger
  });
  expect(property("autocomplete")).toMatchObject({
    defaultValue: DateFieldAutocomplete.Off,
    enumValues: Object.values(DateFieldAutocomplete)
  });
  expect(property("updateOn")).toMatchObject({ defaultValue: UiUpdateTrigger.Input });
  expect(dateFieldDescriptor.constraints).toContainEqual(
    expect.objectContaining({ kind: CatalogConstraintKind.DateFieldRange })
  );
});

function property(name: string) {
  return dateFieldDescriptor.properties.find((candidate) => candidate.name === name);
}
