// @vitest-environment happy-dom
import type { TableColumn, TableRow } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { registerCoreElements, UnifoldTable } from "./index.js";

it("renders escaped native table semantics and stable row identities", async () => {
  const table = configuredTable();
  document.body.append(table);
  await table.updateComplete;
  const root = table.shadowRoot as ShadowRoot;

  expect(requireElement(root, "caption").textContent?.trim()).toBe("People <script>");
  expect(root.querySelector("script")).toBeNull();
  expect(root.querySelectorAll('th[scope="col"]')).toHaveLength(2);
  expect(root.querySelectorAll('th[scope="row"]')).toHaveLength(2);
  expect(requireElement(root, '[data-row-id="ada"]').textContent).toContain("Ada");
  expect(root.querySelector("strong")).toBeNull();
});

it("renders one spanned native empty-state cell", async () => {
  const table = configuredTable();
  table.rows = [];
  document.body.append(table);
  await table.updateComplete;

  const empty = requireElement(table.shadowRoot as ShadowRoot, '[part="empty"]');
  expect(empty.getAttribute("colspan")).toBe("2");
  expect(empty.textContent).toBe("No people");
});

function requireElement(root: ShadowRoot, selector: string): Element {
  const element = root.querySelector(selector);
  if (element === null) throw new Error(`Missing ${selector}.`);
  return element;
}

function configuredTable(): UnifoldTable {
  registerCoreElements();
  const table = document.createElement("unifold-table") as UnifoldTable;
  table.caption = "People <script>";
  table.columns = columns();
  table.emptyMessage = "No people";
  table.rows = rows();
  return table;
}

function columns(): readonly TableColumn[] {
  return [
    { key: "name", label: "Name" },
    { key: "active", label: "Active" }
  ];
}

function rows(): readonly TableRow[] {
  return [
    { cells: { active: true, name: "Ada" }, id: "ada" },
    { cells: { active: false, name: "<strong>Grace</strong>" }, id: "grace" }
  ];
}
