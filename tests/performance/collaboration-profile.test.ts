import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureCollaborationPerformance } from "./collaboration-fixture.js";

const outputPath = process.env["UNIFOLD_COLLABORATION_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the collaboration performance gates", async () => {
  const evidence = measureCollaborationPerformance();
  expect(evidence.gates.every(({ passed }) => passed)).toBe(true);
  await writeFile(String(outputPath), `${JSON.stringify(evidence, null, 2)}\n`);
});
