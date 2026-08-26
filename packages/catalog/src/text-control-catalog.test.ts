import { UiUpdateTrigger } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CatalogPropertyType } from "./enums.js";
import { textControlProperties } from "./text-control-catalog.js";

it("shares exact scalar text-control properties and supports a required label", () => {
  const properties = textControlProperties([], true);
  expect(properties.find(({ name }) => name === "label")).toMatchObject({ required: true });
  expect(properties.find(({ name }) => name === "value")).toMatchObject({
    defaultValue: "",
    valueType: CatalogPropertyType.String
  });
  expect(properties.find(({ name }) => name === "updateOn")?.enumValues).toEqual(
    Object.values(UiUpdateTrigger)
  );
});
