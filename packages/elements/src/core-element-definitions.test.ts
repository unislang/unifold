// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { coreElementDefinitions } from "./core-element-definitions.js";

const deferredTags = new Set([
  CoreElementTag.AuditLog,
  CoreElementTag.Combobox,
  CoreElementTag.DataGrid,
  CoreElementTag.MasterDetail,
  CoreElementTag.MenuButton,
  CoreElementTag.Popover,
  CoreElementTag.SearchResults,
  CoreElementTag.Stepper,
  CoreElementTag.Tabs,
  CoreElementTag.Tooltip,
  CoreElementTag.VirtualList,
  CoreElementTag.Wizard
]);

it("maps every eager foundation tag to exactly one custom element constructor", () => {
  const tags = coreElementDefinitions.map(([tagName]) => tagName);
  expect(tags).toEqual(Object.values(CoreElementTag).filter((tag) => !deferredTags.has(tag)));
  expect(new Set(tags).size).toBe(tags.length);
});
