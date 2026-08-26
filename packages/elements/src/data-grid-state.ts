import {
  DataGridSortDirection,
  type DataGridSort,
  type DataGridValue,
  type TableCellValue,
  type TableRow
} from "@unislang/unifold-catalog";

export function sortedRows(
  rows: readonly TableRow[],
  sort: DataGridValue["sort"]
): readonly TableRow[] {
  if (sort === undefined) return rows;
  const multiplier = sort.direction === DataGridSortDirection.Ascending ? 1 : -1;
  return rows
    .map((row, index) => ({ index, row }))
    .sort(
      (left, right) =>
        multiplier * compareCells(left.row.cells[sort.key], right.row.cells[sort.key]) ||
        left.index - right.index
    )
    .map(({ row }) => row);
}

export function toggleSelection(
  values: readonly string[],
  id: string,
  checked: boolean
): readonly string[] {
  if (checked) return values.includes(id) ? values : [...values, id];
  return values.filter((value) => value !== id);
}

export function nextDirection(value: DataGridValue, key: string): DataGridSort["direction"] {
  const sort = value.sort;
  if (sort === undefined) return DataGridSortDirection.Ascending;
  if (sort.key !== key) return DataGridSortDirection.Ascending;
  return invertDirection(sort.direction);
}

export function cellText(value: TableCellValue | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function compareCells(left: TableCellValue | undefined, right: TableCellValue | undefined): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return cellText(left).localeCompare(cellText(right), undefined, { numeric: true });
}

function invertDirection(direction: DataGridSort["direction"]): DataGridSort["direction"] {
  return direction === DataGridSortDirection.Ascending
    ? DataGridSortDirection.Descending
    : DataGridSortDirection.Ascending;
}
