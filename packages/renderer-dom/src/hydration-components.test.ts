import { CoreComponentType } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { isStaticChoiceComponent, isStaticValueComponent } from "./hydration-components.js";

it("classifies CheckboxGroup as a hydratable choice value", () => {
  expect(isStaticChoiceComponent(CoreComponentType.CheckboxGroup)).toBe(true);
  expect(isStaticValueComponent(CoreComponentType.CheckboxGroup)).toBe(true);
  expect(isStaticChoiceComponent(CoreComponentType.SearchField)).toBe(false);
});
