import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import { numberFieldDescriptor } from "./number-field-catalog.js";

it("publishes an exact nullable finite-number control contract", () => {
  expect(numberFieldDescriptor).toMatchObject({
    componentType: CoreComponentType.NumberField,
    tagName: CoreElementTag.NumberField
  });
  expect(numberFieldDescriptor.properties.find(({ name }) => name === "label")).toMatchObject({
    required: true
  });
  expect(numberFieldDescriptor.properties.find(({ name }) => name === "value")).toMatchObject({
    defaultValue: null,
    valueType: CatalogPropertyType.NullableNumber
  });
  expect(numberFieldDescriptor.properties.find(({ name }) => name === "step")).toMatchObject({
    defaultValue: 1,
    valueType: CatalogPropertyType.PositiveNumber
  });
  expect(numberFieldDescriptor.constraints).toContainEqual(
    expect.objectContaining({ kind: CatalogConstraintKind.NumberFieldRange })
  );
});
