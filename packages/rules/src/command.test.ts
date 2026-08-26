import { UiDerivedRuleOutputKind } from "@unislang/unifold-contracts";
import { UiCommandType } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { createDerivedRuleCommand } from "./command.js";

it("maps rule results only to the approved typed command profile", () => {
  expect(
    createDerivedRuleCommand(
      { kind: UiDerivedRuleOutputKind.NodePatchProperty, nodeId: "summary", property: "text" },
      "ready"
    )
  ).toEqual({
    id: "summary",
    properties: { text: "ready" },
    type: UiCommandType.NodePatchProperties
  });
  expect(() =>
    createDerivedRuleCommand(
      { kind: UiDerivedRuleOutputKind.ControlSetDisabled, nodeId: "submit" },
      "yes"
    )
  ).toThrow("boolean");
});
