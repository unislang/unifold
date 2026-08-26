import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureDevtoolsPerformance } from "./devtools-fixture.js";

const outputPath = process.env["UNIFOLD_DEVTOOLS_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the devtools performance gates", async () => {
  const evidence = measureDevtoolsPerformance();
  expect(evidence.gates.every(({ passed }) => passed)).toBe(true);
  await writeFile(String(outputPath), `${JSON.stringify(evidence, null, 2)}\n`);
});
