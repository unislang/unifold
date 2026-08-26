// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { TABLE_ROW_COUNT, measureTableStartup } from "./table-fixture.js";

const outputPath = process.env["UNIFOLD_TABLE_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the 1k native-table startup gate", async () => {
  const evidence = await measureTableStartup();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.minimumRenderedRows).toBe(TABLE_ROW_COUNT);
  expect(evidence.maximumRenderedRows).toBe(TABLE_ROW_COUNT);
  expect(evidence.gate.passed).toBe(true);
});
