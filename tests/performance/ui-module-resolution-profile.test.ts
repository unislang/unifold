import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureUiModuleResolution } from "./ui-module-resolution-fixture.js";

const outputPath = process.env["UNIFOLD_UI_MODULE_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the bounded UiModule resolution gate", async () => {
  const evidence = await measureUiModuleResolution();
  await writeFile(String(outputPath), `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.gate.passed).toBe(true);
});
