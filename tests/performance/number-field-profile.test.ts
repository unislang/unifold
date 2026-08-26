// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureNumberFieldProjection } from "./number-field-fixture.js";

const outputPath = process.env["UNIFOLD_NUMBER_FIELD_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the bounded NumberField projection gate", async () => {
  const evidence = await measureNumberFieldProjection();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.gate.passed).toBe(true);
});
