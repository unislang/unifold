import { UiNodeKind } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { nodeKindForComponent } from "./node-kind.js";

it("owns the single component-to-node-kind mapping", () => {
  expect(nodeKindForComponent("TextField")).toBe(UiNodeKind.Control);
  expect(nodeKindForComponent("Combobox")).toBe(UiNodeKind.Control);
  expect(nodeKindForComponent("DataGrid")).toBe(UiNodeKind.Control);
  expect(nodeKindForComponent("MasterDetail")).toBe(UiNodeKind.Control);
  expect(nodeKindForComponent("MenuButton")).toBe(UiNodeKind.Component);
  expect(nodeKindForComponent("Tooltip")).toBe(UiNodeKind.Component);
  expect(nodeKindForComponent("Stepper")).toBe(UiNodeKind.Control);
  expect(nodeKindForComponent("Tabs")).toBe(UiNodeKind.Control);
  expect(nodeKindForComponent("Wizard")).toBe(UiNodeKind.Control);
  expect(nodeKindForComponent("Form")).toBe(UiNodeKind.Form);
  expect(nodeKindForComponent("missing")).toBeUndefined();
});
