import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { ComponentAccessibilityPattern } from "./enums.js";
import { popoverSidecar } from "./popover-sidecar.js";

it("publishes reviewed Popover accessibility and browser evidence", () => {
  expect(popoverSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.Popover },
    componentType: CoreComponentType.Popover,
    testManifest: {
      browserScenarios: [
        "opens interactive JSON content and restores focus without losing identity"
      ],
      requirementIds: expect.arrayContaining(["A11Y.POPOVER.FOCUS", "A11Y.POPOVER.DISMISS"])
    }
  });
});
