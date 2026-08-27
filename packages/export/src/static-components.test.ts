import { expect, it } from "vitest";

import * as staticComponents from "./static-components.js";

it("exports every specialized static data-view renderer", () => {
  expect(Object.keys(staticComponents).sort()).toEqual([
    "renderStaticAuditLog",
    "renderStaticBreadcrumb",
    "renderStaticCheckboxGroup",
    "renderStaticDataGrid",
    "renderStaticDateField",
    "renderStaticDialog",
    "renderStaticFileInput",
    "renderStaticMasterDetail",
    "renderStaticMenuButton",
    "renderStaticNumberField",
    "renderStaticPagination",
    "renderStaticPopover",
    "renderStaticSearchField",
    "renderStaticSearchResults",
    "renderStaticStepper",
    "renderStaticSwitch",
    "renderStaticTable",
    "renderStaticTabs",
    "renderStaticToast",
    "renderStaticTooltip",
    "renderStaticVirtualList",
    "renderStaticWizard"
  ]);
});
