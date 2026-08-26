// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureNativeFormLifecycle } from "./native-form-lifecycle-fixture.js";

const outputPath = process.env["UNIFOLD_NATIVE_FORM_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the native form lifecycle gate", async () => {
  const evidence = measureNativeFormLifecycle();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.gate.passed).toBe(true);
});
