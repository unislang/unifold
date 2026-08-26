export const FOUNDATION_ROW_COUNT = 1_000;

export function mountNativeCandidate(
  container: HTMLElement,
  rowCount = FOUNDATION_ROW_COUNT
): HTMLTableElement {
  const table = document.createElement("table");
  table.setAttribute("aria-label", "Foundation records");
  table.append(createHead(), createBody(rowCount));
  container.append(table);
  return table;
}

function createHead(): HTMLTableSectionElement {
  const head = document.createElement("thead");
  const row = document.createElement("tr");
  row.append(header("Select"), sortableHeader("Name"), header("Active"));
  head.append(row);
  return head;
}

function createBody(rowCount: number): HTMLTableSectionElement {
  const body = document.createElement("tbody");
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < rowCount; index += 1) fragment.append(createRow(index));
  body.append(fragment);
  return body;
}

function createRow(index: number): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.dataset["rowId"] = `person-${index}`;
  const selection = document.createElement("td");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.setAttribute("aria-label", `Select Person ${index}`);
  selection.append(checkbox);
  row.append(selection, cell(`Person ${index}`), cell(String(index % 2 === 0)));
  return row;
}

function header(label: string): HTMLTableCellElement {
  const cell = document.createElement("th");
  cell.scope = "col";
  cell.textContent = label;
  return cell;
}

function sortableHeader(label: string): HTMLTableCellElement {
  const cell = header("");
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  cell.append(button);
  return cell;
}

function cell(value: string): HTMLTableCellElement {
  const item = document.createElement("td");
  item.textContent = value;
  return item;
}

Reflect.set(globalThis, "__mountDataGridFoundation", mountNativeCandidate);
