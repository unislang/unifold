// @vitest-environment happy-dom
import {
  DataGridSelectionMode,
  type DataGridValue,
  type TableColumn,
  type TableRow
} from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import { defineUnifoldDataGrid, UnifoldDataGrid } from "./data-grid-entry.js";
import { ElementEventName } from "./index.js";
import { controlNode } from "./elements.test-data.js";

it("renders escaped native grid semantics and stable sorted row identities", async () => {
  const grid = configuredGrid();
  document.body.append(grid);
  await grid.updateComplete;
  const root = grid.shadowRoot as ShadowRoot;

  expect(requireElement(root, "caption").textContent?.trim()).toBe("People <script>");
  expect(root.querySelector("script")).toBeNull();
  expect(root.querySelectorAll('th[scope="col"]')).toHaveLength(3);
  expect(root.querySelectorAll('th[scope="row"]')).toHaveLength(2);
  expect(rowIds(root)).toEqual(["ada", "grace"]);
  expect(root.querySelector("strong")).toBeNull();

  requireButton(root, "Name").click();
  await grid.updateComplete;
  expect(grid.value.sort).toEqual({ direction: "ascending", key: "name" });
  expect(rowIds(root)).toEqual(["ada", "grace"]);
  expect(requireButton(root, "Name").parentElement?.getAttribute("aria-sort")).toBe("ascending");

  requireButton(root, "Name").click();
  await grid.updateComplete;
  expect(rowIds(root)).toEqual(["grace", "ada"]);
});

it("emits complete canonical multiple-selection and blur values", async () => {
  const grid = configuredGrid();
  const events = vi.fn();
  grid.addEventListener(ElementEventName.UiEvent, events);
  document.body.append(grid);
  await grid.updateComplete;

  change(requireInput(grid, 'input[aria-label="Select Ada"]'), true);
  await grid.updateComplete;
  expect(grid.value.selectedRowIds).toEqual(["ada"]);
  expect(events.mock.calls[0]?.[0].detail.data.change.value).toEqual({ selectedRowIds: ["ada"] });

  change(requireInput(grid, 'input[aria-label="Select all rows"]'), true);
  await grid.updateComplete;
  expect(grid.value.selectedRowIds).toEqual(["ada", "grace"]);
  expect(events).toHaveBeenCalledTimes(2);

  requireElement(grid.shadowRoot as ShadowRoot, '[part="container"]').dispatchEvent(
    new FocusEvent("focusout", { relatedTarget: null })
  );
  expect(events).toHaveBeenCalledTimes(3);
  expect(events.mock.calls[2]?.[0].detail.data.change.value.selectedRowIds).toEqual([
    "ada",
    "grace"
  ]);
});

it("uses one native radio selection and spans selection-aware empty state", async () => {
  const grid = configuredGrid();
  grid.selectionMode = DataGridSelectionMode.Single;
  grid.rows = [];
  document.body.append(grid);
  await grid.updateComplete;

  const empty = requireElement(grid.shadowRoot as ShadowRoot, '[part="empty"]');
  expect(empty.getAttribute("colspan")).toBe("3");
  expect(empty.textContent).toBe("No people");
});

function configuredGrid(): UnifoldDataGrid {
  defineUnifoldDataGrid();
  const value: DataGridValue = { selectedRowIds: [] };
  const grid = document.createElement("unifold-data-grid") as UnifoldDataGrid;
  Object.assign(grid, {
    caption: "People <script>",
    columns: columns(),
    emptyMessage: "No people",
    id: "people",
    rows: rows(),
    selectionMode: DataGridSelectionMode.Multiple,
    sortableColumns: ["name"],
    value
  });
  grid.eventNode = controlNode("people", value, undefined, "DataGrid");
  return grid;
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
    { cells: { active: false, name: "Grace <strong>unsafe</strong>" }, id: "grace" }
  ];
}

function requireElement(root: ShadowRoot, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (element === null) throw new Error(`Missing ${selector}.`);
  return element;
}

function requireButton(root: ShadowRoot, label: string): HTMLButtonElement {
  const button = [...root.querySelectorAll<HTMLButtonElement>("button")].find(
    ({ textContent }) => textContent?.trim() === label
  );
  if (button === undefined) throw new Error(`Missing ${label} button.`);
  return button;
}

function requireInput(grid: UnifoldDataGrid, selector: string): HTMLInputElement {
  const root = grid.shadowRoot;
  if (root === null) throw new Error("Missing DataGrid shadow root.");
  const input = root.querySelector<HTMLInputElement>(selector);
  if (input === null) throw new Error(`Missing ${selector}.`);
  return input;
}

function change(input: HTMLInputElement, checked: boolean): void {
  input.checked = checked;
  input.dispatchEvent(new Event("change"));
}

function rowIds(root: ShadowRoot): readonly string[] {
  return [...root.querySelectorAll<HTMLElement>("tbody tr[data-row-id]")].map(
    ({ dataset }) => dataset["rowId"] ?? ""
  );
}
