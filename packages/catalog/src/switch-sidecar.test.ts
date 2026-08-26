import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { ComponentAccessibilityPattern } from "./definition-enums.js";
import { switchSidecar } from "./switch-sidecar.js";

it("publishes reviewed switch semantics and boolean-form evidence", () => {
  expect(switchSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.Switch },
    componentType: CoreComponentType.Switch,
    testManifest: {
      browserScenarios: [
        "routes one native Switch through events, form state, and selective projection"
      ]
    }
  });
  expect(switchSidecar.testManifest.requirementIds).toContain("FORM.SWITCH.BOOLEAN");
});
