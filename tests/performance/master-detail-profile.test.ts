// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureMasterDetailPerformance } from "./master-detail-fixture.js";

const outputPath = process.env["UNIFOLD_MASTER_DETAIL_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the 10k MasterDetail performance gates", async () => {
  const evidence = await measureMasterDetailPerformance();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.gates.every(({ passed }) => passed)).toBe(true);
});
