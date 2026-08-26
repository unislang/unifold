import { expect, it } from "vitest";

import * as staticComponents from "./static-components.js";

it("exports every specialized static data-view renderer", () => {
  expect(Object.keys(staticComponents).sort()).toEqual([
    "renderStaticAuditLog",
    "renderStaticDataGrid",
    "renderStaticMasterDetail",
    "renderStaticMenuButton",
    "renderStaticSearchResults",
    "renderStaticStepper",
    "renderStaticTable",
    "renderStaticTabs",
    "renderStaticTooltip",
    "renderStaticVirtualList",
    "renderStaticWizard"
  ]);
});
