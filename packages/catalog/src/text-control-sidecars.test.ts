import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { ComponentAccessibilityPattern } from "./definition-enums.js";
import { searchFieldSidecar, textAreaSidecar, textFieldSidecar } from "./text-control-sidecars.js";

it("records reviewed scalar text-control accessibility and privacy evidence", () => {
  expect(searchFieldSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.NativeSearchInput },
    componentType: CoreComponentType.SearchField,
    privacy: { sensitiveProperties: expect.arrayContaining(["value"]) }
  });
  expect([textAreaSidecar.componentType, textFieldSidecar.componentType]).toEqual([
    CoreComponentType.TextArea,
    CoreComponentType.TextField
  ]);
});
