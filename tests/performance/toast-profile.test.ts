// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureToastProjection } from "./toast-fixture.js";

const outputPath = process.env["UNIFOLD_TOAST_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the bounded Toast projection gate", async () => {
  const evidence = await measureToastProjection();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.gate.passed).toBe(true);
});
