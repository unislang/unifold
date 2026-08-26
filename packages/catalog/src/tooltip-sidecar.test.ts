import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { ComponentAccessibilityPattern } from "./definition-enums.js";
import { tooltipSidecar } from "./tooltip-sidecar.js";

it("publishes executable Tooltip keyboard and overlay evidence", () => {
  expect(tooltipSidecar.componentType).toBe(CoreComponentType.Tooltip);
  expect(tooltipSidecar.accessibility.pattern).toBe(ComponentAccessibilityPattern.Tooltip);
  expect(tooltipSidecar.testManifest.browserScenarios).toEqual([
    "reveals bounded contextual help without moving focus"
  ]);
  expect(tooltipSidecar.privacy.sensitiveProperties).toEqual(["content", "label"]);
});
