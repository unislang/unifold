// @vitest-environment happy-dom
import { expect, it } from "vitest";

import {
  DATA_GRID_ROW_COUNT,
  disposeDataGrid,
  exerciseDataGrid,
  mountDataGrid
} from "./data-grid-fixture.js";

it("mounts, sorts, and selects 1,000 native JSON DataGrid rows", async () => {
  const mounted = await mountDataGrid();
  try {
    const evidence = await exerciseDataGrid(mounted.element);
    expect(evidence.renderedRows).toBe(DATA_GRID_ROW_COUNT);
    expect(evidence.sortedFirstRowId).toBe("person-0");
    expect(evidence.selected).toBe(true);
  } finally {
    disposeDataGrid(mounted);
  }
});
