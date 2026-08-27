import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { dateFieldSidecar } from "./date-field-sidecar.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";

it("records reviewed DateField behavior and executable evidence", () => {
  expect(dateFieldSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.NativeDateInput },
    componentType: CoreComponentType.DateField,
    privacy: { sensitiveProperties: expect.arrayContaining(["value"]) }
  });
  expect(dateFieldSidecar.testManifest.browserScenarios).toEqual([
    "routes a date-only field through events, form state, and selective projection"
  ]);
});
