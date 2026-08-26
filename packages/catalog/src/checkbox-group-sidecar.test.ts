import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { checkboxGroupSidecar } from "./checkbox-group-sidecar.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";

it("publishes reviewed native group and repeated-form evidence", () => {
  expect(checkboxGroupSidecar).toMatchObject({
    componentType: CoreComponentType.CheckboxGroup,
    accessibility: { pattern: ComponentAccessibilityPattern.NativeCheckboxGroup },
    testManifest: {
      browserScenarios: ["routes CheckboxGroup selections through canonical repeated state"]
    }
  });
  expect(checkboxGroupSidecar.testManifest.requirementIds).toContain(
    "FORM.CHECKBOX_GROUP.REPEATED"
  );
});
