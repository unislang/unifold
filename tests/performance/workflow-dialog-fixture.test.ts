// @vitest-environment happy-dom
import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { defineWorkflowDialog, workflowDialogNode } from "./workflow-dialog-fixture.js";

it("defines one bounded 32-action workflow Dialog", () => {
  defineWorkflowDialog();
  const node = workflowDialogNode();
  expect(node["$comp"]).toBe(CoreComponentType.Dialog);
  expect(node["$children"]).toHaveLength(32);
});
