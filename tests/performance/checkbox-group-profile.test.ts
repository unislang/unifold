// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureCheckboxGroupProjection } from "./checkbox-group-fixture.js";

const outputPath = process.env["UNIFOLD_CHECKBOX_GROUP_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the CheckboxGroup projection gate", async () => {
  const evidence = await measureCheckboxGroupProjection();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.gate.passed).toBe(true);
});
