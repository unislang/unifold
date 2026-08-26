import { expect, it } from "vitest";

import * as staticComponents from "./static-components.js";

it("exports every specialized static data-view renderer", () => {
  expect(Object.keys(staticComponents).sort()).toEqual([
    "renderStaticAuditLog",
    "renderStaticBreadcrumb",
    "renderStaticCheckboxGroup",
    "renderStaticDataGrid",
    "renderStaticDialog",
    "renderStaticFileInput",
    "renderStaticMasterDetail",
    "renderStaticMenuButton",
    "renderStaticNumberField",
    "renderStaticPopover",
    "renderStaticSearchField",
    "renderStaticSearchResults",
    "renderStaticStepper",
    "renderStaticTable",
    "renderStaticTabs",
    "renderStaticTooltip",
    "renderStaticVirtualList",
    "renderStaticWizard"
  ]);
});
