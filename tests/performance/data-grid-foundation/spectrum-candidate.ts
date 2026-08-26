import "@spectrum-web-components/table/elements.js";

import { FOUNDATION_ROW_COUNT } from "./native-candidate.js";

interface SpectrumTable extends HTMLElement {
  readonly updateComplete: Promise<boolean>;
}

export async function mountSpectrumCandidate(
  container: HTMLElement,
  rowCount = FOUNDATION_ROW_COUNT
): Promise<SpectrumTable> {
  const table = document.createElement("sp-table") as SpectrumTable;
  table.setAttribute("aria-label", "Foundation records");
  table.setAttribute("selects", "multiple");
  table.append(createHead(), createBody(rowCount));
  container.append(table);
  await table.updateComplete;
  return table;
}

function createHead(): HTMLElement {
  const head = document.createElement("sp-table-head");
  head.append(header("Name", true), header("Active", false));
  return head;
}

function createBody(rowCount: number): HTMLElement {
  const body = document.createElement("sp-table-body");
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < rowCount; index += 1) fragment.append(createRow(index));
  body.append(fragment);
  return body;
}

function createRow(index: number): HTMLElement {
  const row = document.createElement("sp-table-row");
  row.setAttribute("value", `person-${index}`);
  row.append(cell(`Person ${index}`), cell(String(index % 2 === 0)));
  return row;
}

function header(label: string, sortable: boolean): HTMLElement {
  const cell = document.createElement("sp-table-head-cell");
  cell.textContent = label;
  if (sortable) {
    cell.setAttribute("sortable", "");
    cell.setAttribute("sort-key", "name");
  }
  return cell;
}

function cell(value: string): HTMLElement {
  const item = document.createElement("sp-table-cell");
  item.textContent = value;
  return item;
}

Reflect.set(globalThis, "__mountDataGridFoundation", mountSpectrumCandidate);
