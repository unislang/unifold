// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureSearchResultsPerformance } from "./search-results-fixture.js";

const outputPath = process.env["UNIFOLD_SEARCH_RESULTS_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the 10k SearchResults performance gates", async () => {
  const evidence = await measureSearchResultsPerformance();
  expect(evidence.gates.every(({ passed }) => passed)).toBe(true);
  await writeFile(String(outputPath), `${JSON.stringify(evidence, null, 2)}\n`);
});
