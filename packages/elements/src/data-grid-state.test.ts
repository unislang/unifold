import { expect, it } from "vitest";

import { cellText, nextDirection, sortedRows, toggleSelection } from "./data-grid-state.js";

const rows = [
  { cells: { score: 2 }, id: "second" },
  { cells: { score: 1 }, id: "first-a" },
  { cells: { score: 1 }, id: "first-b" }
];

it("sorts scalars stably and toggles controlled DataGrid state", () => {
  expect(sortedRows(rows, { direction: "ascending", key: "score" }).map(({ id }) => id)).toEqual([
    "first-a",
    "first-b",
    "second"
  ]);
  expect(sortedRows(rows, { direction: "descending", key: "score" }).map(({ id }) => id)).toEqual([
    "second",
    "first-a",
    "first-b"
  ]);
  expect(toggleSelection(["first-a"], "second", true)).toEqual(["first-a", "second"]);
  expect(toggleSelection(["first-a", "second"], "first-a", false)).toEqual(["second"]);
  expect(nextDirection({ selectedRowIds: [] }, "score")).toBe("ascending");
  expect(
    nextDirection({ selectedRowIds: [], sort: { direction: "ascending", key: "score" } }, "score")
  ).toBe("descending");
});

it("preserves unsorted rows and covers text, null, and idempotent state paths", () => {
  expect(sortedRows(rows, undefined)).toBe(rows);
  expect(
    sortedRows(
      [
        { cells: { name: "Beta" }, id: "beta" },
        { cells: { name: "Alpha" }, id: "alpha" }
      ],
      { direction: "ascending", key: "name" }
    ).map(({ id }) => id)
  ).toEqual(["alpha", "beta"]);
  expect(toggleSelection(["first-a"], "first-a", true)).toEqual(["first-a"]);
  expect(
    nextDirection({ selectedRowIds: [], sort: { direction: "descending", key: "other" } }, "score")
  ).toBe("ascending");
  expect(
    nextDirection({ selectedRowIds: [], sort: { direction: "descending", key: "score" } }, "score")
  ).toBe("ascending");
  expect([cellText(null), cellText(undefined), cellText(false)]).toEqual(["", "", "false"]);
});
