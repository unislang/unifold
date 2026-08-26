// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureComboboxFilter } from "./combobox-filter-fixture.js";

const outputPath = process.env["UNIFOLD_COMBOBOX_FILTER_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the 10k-option combobox filter gate", async () => {
  const evidence = await measureComboboxFilter();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.maximumRenderedOptions).toBeLessThanOrEqual(200);
  expect(evidence.gate.passed).toBe(true);
});
