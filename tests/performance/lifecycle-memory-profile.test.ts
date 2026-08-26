// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureLifecycleMemory } from "./lifecycle-memory-fixture.js";

const outputPath = process.env["UNIFOLD_LIFECYCLE_MEMORY_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the 20-cycle lifecycle heap gate", async () => {
  const evidence = await measureLifecycleMemory();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.cycles).toBe(20);
  expect(evidence.gate.passed).toBe(true);
});
