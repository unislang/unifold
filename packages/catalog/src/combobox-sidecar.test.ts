import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { comboboxSidecar } from "./combobox-sidecar.js";
import { ComponentAccessibilityPattern } from "./enums.js";

it("publishes the reviewed combobox behavior and accessibility evidence contract", () => {
  expect(comboboxSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.Combobox },
    componentType: CoreComponentType.Combobox
  });
  expect(comboboxSidecar.accessibility.requirementIds).toEqual(
    expect.arrayContaining(["A11Y.COMBOBOX.KEYBOARD", "A11Y.COMBOBOX.ACTIVE_DESCENDANT"])
  );
});
