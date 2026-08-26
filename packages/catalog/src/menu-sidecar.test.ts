import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { ComponentAccessibilityPattern } from "./definition-enums.js";
import { menuButtonSidecar } from "./menu-sidecar.js";

it("publishes executable MenuButton keyboard and activation evidence", () => {
  expect(menuButtonSidecar.componentType).toBe(CoreComponentType.MenuButton);
  expect(menuButtonSidecar.accessibility.pattern).toBe(ComponentAccessibilityPattern.MenuButton);
  expect(menuButtonSidecar.testManifest.browserScenarios).toEqual([
    "invokes a bounded menu action with restored trigger focus"
  ]);
  expect(menuButtonSidecar.privacy.sensitiveProperties).toEqual(["items", "label"]);
});
