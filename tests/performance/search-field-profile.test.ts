// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureSearchFieldProjection } from "./search-field-fixture.js";

const outputPath = process.env["UNIFOLD_SEARCH_FIELD_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the bounded SearchField projection gate", async () => {
  const evidence = await measureSearchFieldProjection();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.gate.passed).toBe(true);
});
