import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { ComponentAccessibilityPattern } from "./enums.js";
import { fileInputSidecar } from "./file-input-sidecar.js";

it("documents FileInput byte isolation and bounded native evidence", () => {
  expect(fileInputSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.NativeFileInput },
    componentType: CoreComponentType.FileInput,
    privacy: { sensitiveProperties: expect.arrayContaining(["value"]) }
  });
  expect(fileInputSidecar.testManifest.browserScenarios).toHaveLength(1);
  expect(fileInputSidecar.testManifest.requirementIds).toContain(
    "SECURITY.FILE_INPUT.NO_BYTES_IN_JSON"
  );
  expect(fileInputSidecar.behaviors.join(" ")).toContain("opaque ID");
  expect(fileInputSidecar.behaviors.join(" ")).not.toMatch(/file name|modification-time/iu);
});
