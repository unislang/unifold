// @vitest-environment happy-dom
import type { TableColumn, TableRow } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import {
  ElementEventName,
  registerCoreElements,
  UnifoldMasterDetail,
  type UnifoldVirtualList
} from "./index.js";
import { controlNode } from "./elements.test-data.js";

it("selects a virtual master record and emits its complete canonical value", async () => {
  const workspace = configuredWorkspace();
  const events = vi.fn();
  workspace.addEventListener(ElementEventName.UiEvent, events);
  document.body.append(workspace);
  await workspace.updateComplete;

  const viewport = requireViewport(workspace);
  viewport.focus();
  viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
  viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  await workspace.updateComplete;

  expect(workspace.value).toBe("grace");
  expect(requireDetail(workspace).textContent).toContain("Pending");
  expect(events).toHaveBeenCalledTimes(1);
  const detail = events.mock.calls[0]?.[0].detail;
  expect(detail.data.change).toEqual({ value: "grace" });
  expect(detail.data.snapshot.control.value).toBe("grace");
  expect(detail.data.snapshot.properties).not.toHaveProperty("options");
  expect(workspace.shadowRoot?.activeElement).toBe(viewport);
});

it("bounds a 10k master list and renders hostile scalar fields as text", async () => {
  const workspace = configuredWorkspace();
  workspace.rows = rows(10_000);
  workspace.value = "record-09999";
  document.body.append(workspace);
  await workspace.updateComplete;

  expect(workspace.shadowRoot?.querySelectorAll("[role=option]").length).toBeLessThanOrEqual(200);
  const detail = requireDetail(workspace);
  expect(detail.textContent).toContain('<img src=x onerror="alert(1)"> 9999');
  expect(detail.querySelector("img")).toBeNull();
});

it("shows deterministic empty and no-selection detail states", async () => {
  const workspace = configuredWorkspace();
  workspace.value = "";
  document.body.append(workspace);
  await workspace.updateComplete;
  expect(requireDetail(workspace).textContent).toContain("Choose an account");

  workspace.rows = [];
  await workspace.updateComplete;
  expect(requireDetail(workspace).textContent).toContain("No accounts");
});

function configuredWorkspace(): UnifoldMasterDetail {
  registerCoreElements();
  const workspace = document.createElement("unifold-master-detail") as UnifoldMasterDetail;
  Object.assign(workspace, {
    columns: columns(),
    detailLabel: "Account details",
    emptyMessage: "No accounts",
    id: "accounts",
    itemHeight: 32,
    label: "Accounts",
    masterColumn: "name",
    noSelectionMessage: "Choose an account",
    rows: rows(2),
    value: "ada",
    viewportHeight: 320
  });
  workspace.eventNode = controlNode("accounts", workspace.value, undefined, "MasterDetail");
  return workspace;
}

function columns(): readonly TableColumn[] {
  return [
    { key: "name", label: "Name" },
    { key: "status", label: "Status" }
  ];
}

function rows(count: number): readonly TableRow[] {
  if (count === 2)
    return [
      { cells: { name: "Ada", status: "Active" }, id: "ada" },
      { cells: { name: "Grace", status: "Pending" }, id: "grace" }
    ];
  return Array.from({ length: count }, (_, index) => ({
    cells: {
      name: `Record ${index}`,
      status: `<img src=x onerror="alert(1)"> ${index}`
    },
    id: `record-${String(index).padStart(5, "0")}`
  }));
}

function requireViewport(workspace: UnifoldVirtualList): HTMLElement {
  const root = workspace.shadowRoot;
  if (root === null) throw new Error("Master shadow root is missing.");
  const viewport = root.querySelector<HTMLElement>("[part=viewport]");
  if (!(viewport instanceof HTMLElement)) throw new Error("Master viewport is missing.");
  return viewport;
}

function requireDetail(workspace: UnifoldMasterDetail): HTMLElement {
  const root = workspace.shadowRoot;
  if (root === null) throw new Error("MasterDetail shadow root is missing.");
  const detail = root.querySelector<HTMLElement>("[part=detail]");
  if (!(detail instanceof HTMLElement)) throw new Error("Detail pane is missing.");
  return detail;
}
