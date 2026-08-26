import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureDataActorPerformance } from "./data-actor-fixture.js";

const outputPath = process.env["UNIFOLD_DATA_ACTOR_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the data-actor performance gates", async () => {
  const evidence = await measureDataActorPerformance();
  expect(evidence.gates.every(({ passed }) => passed)).toBe(true);
  await writeFile(String(outputPath), `${JSON.stringify(evidence, null, 2)}\n`);
});
