// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureVirtualListStartup } from "./virtual-list-fixture.js";

const outputPath = process.env["UNIFOLD_VIRTUAL_LIST_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the 10k virtual-list startup gate", async () => {
  const evidence = await measureVirtualListStartup();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.renderedRowLimit).toBe(200);
  expect(evidence.maximumRenderedRows).toBeLessThanOrEqual(200);
  expect(evidence.gate.passed).toBe(true);
});
