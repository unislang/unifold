// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureAsyncStorePerformance } from "./async-store-fixture.js";

const outputPath = process.env["UNIFOLD_ASYNC_STORE_OUTPUT"];

it.runIf(outputPath !== undefined)("writes async store performance gates", async () => {
  const evidence = await measureAsyncStorePerformance();
  expect(evidence.gates.every(({ passed }) => passed)).toBe(true);
  await writeFile(String(outputPath), `${JSON.stringify(evidence, null, 2)}\n`);
});
