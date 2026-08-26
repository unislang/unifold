import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { ComponentAccessibilityPattern } from "./definition-enums.js";
import { numberFieldSidecar } from "./number-field-sidecar.js";

it("records reviewed NumberField behavior and executable evidence", () => {
  expect(numberFieldSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.NativeNumberInput },
    componentType: CoreComponentType.NumberField,
    privacy: { sensitiveProperties: expect.arrayContaining(["value"]) }
  });
  expect(numberFieldSidecar.testManifest.browserScenarios).toEqual([
    "routes bounded NumberField input through numeric canonical state"
  ]);
});
