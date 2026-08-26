// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureDataGridFoundations } from "./data-grid-foundation-fixture.js";

const outputPath = process.env["UNIFOLD_DATA_GRID_FOUNDATION_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the DataGrid foundation decision", async () => {
  const evidence = await measureDataGridFoundations();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.decision.selected).toBe("framework-native");
  expect(evidence.gate.passed).toBe(true);
  expect(evidence.candidates.native.minimumRenderedRows).toBe(1_000);
});
