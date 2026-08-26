import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { dialogSidecar } from "./dialog-sidecar.js";
import { ComponentAccessibilityPattern } from "./enums.js";

it("publishes reviewed Dialog modal, focus, and browser evidence", () => {
  expect(dialogSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.ModalDialog },
    componentType: CoreComponentType.Dialog,
    testManifest: {
      browserScenarios: [
        "opens modal JSON content, contains focus, and recovers without losing identity"
      ],
      requirementIds: expect.arrayContaining([
        "A11Y.DIALOG.FOCUS_CONTAINMENT",
        "A11Y.DIALOG.RETURN_FOCUS"
      ])
    }
  });
});
