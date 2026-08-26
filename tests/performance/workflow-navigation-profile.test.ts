// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureWorkflowNavigationPerformance } from "./workflow-navigation-fixture.js";

const outputPath = process.env["UNIFOLD_WORKFLOW_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the 100-step workflow performance gates", async () => {
  const evidence = await measureWorkflowNavigationPerformance();
  expect(evidence.gates.every(({ passed }) => passed)).toBe(true);
  await writeFile(String(outputPath), `${JSON.stringify(evidence, null, 2)}\n`);
});
