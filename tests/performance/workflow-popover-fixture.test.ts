// @vitest-environment happy-dom
import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { defineWorkflowPopover, workflowPopoverNode } from "./workflow-popover-fixture.js";

it("defines one bounded 32-action workflow Popover", () => {
  defineWorkflowPopover();
  const node = workflowPopoverNode();
  expect(node["$comp"]).toBe(CoreComponentType.Popover);
  expect(node["$children"]).toHaveLength(32);
});
