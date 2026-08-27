import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { ComponentAccessibilityPattern } from "./definition-enums.js";
import { toastSidecar } from "./toast-sidecar.js";

it("records persistent accessible Toast behavior and executable evidence", () => {
  expect(toastSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.LiveRegion },
    componentType: CoreComponentType.Toast,
    privacy: { sensitiveProperties: ["label", "message"] }
  });
  expect(toastSidecar.behaviors).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Persists"),
      expect.stringContaining("visible title"),
      expect.stringContaining("never moves focus"),
      expect.stringContaining("accessibility tree")
    ])
  );
  expect(toastSidecar.testManifest.browserScenarios).toEqual([
    "announces and dismisses one bounded toast through the unified stream"
  ]);
  expect(toastSidecar.semanticAttachmentPoints).toEqual([]);
});
