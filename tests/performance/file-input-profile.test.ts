// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureFileInputSelection } from "./file-input-fixture.js";

const outputPath = process.env["UNIFOLD_FILE_INPUT_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the bounded FileInput selection gate", async () => {
  const evidence = await measureFileInputSelection();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.bytesIsolated).toBe(true);
  expect(evidence.selectedFileCount).toBe(32);
  expect(evidence.retainedHandleCount).toBe(32);
  expect(evidence.gate.passed).toBe(true);
});
