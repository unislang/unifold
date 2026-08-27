// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measurePaginationProjection } from "./pagination-fixture.js";

const outputPath = process.env["UNIFOLD_PAGINATION_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the bounded Pagination projection gate", async () => {
  const evidence = await measurePaginationProjection();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.gate.passed).toBe(true);
});
