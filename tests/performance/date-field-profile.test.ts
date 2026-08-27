// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureDateFieldProjection } from "./date-field-fixture.js";

const outputPath = process.env["UNIFOLD_DATE_FIELD_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the bounded DateField projection gate", async () => {
  const evidence = await measureDateFieldProjection();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.gate.passed).toBe(true);
});
