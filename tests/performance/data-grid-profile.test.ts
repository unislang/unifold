// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { DATA_GRID_ROW_COUNT, measureDataGridPerformance } from "./data-grid-fixture.js";

const outputPath = process.env["UNIFOLD_DATA_GRID_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the 1k native-DataGrid performance gates", async () => {
  const evidence = await measureDataGridPerformance();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.renderedRows).toBe(DATA_GRID_ROW_COUNT);
  expect(evidence.gates.every(({ passed }) => passed)).toBe(true);
});
