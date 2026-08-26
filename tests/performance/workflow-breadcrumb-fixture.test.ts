// @vitest-environment happy-dom
import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { defineWorkflowBreadcrumb, workflowBreadcrumbNode } from "./workflow-breadcrumb-fixture.js";

it("defines one bounded 32-position workflow Breadcrumb", () => {
  defineWorkflowBreadcrumb();
  const node = workflowBreadcrumbNode();
  expect(node["$comp"]).toBe(CoreComponentType.Breadcrumb);
  expect(node["items"]).toHaveLength(32);
});
