// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureSwitchProjection } from "./switch-fixture.js";

const outputPath = process.env["UNIFOLD_SWITCH_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the bounded Switch projection gate", async () => {
  const evidence = await measureSwitchProjection();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.gate.passed).toBe(true);
});
