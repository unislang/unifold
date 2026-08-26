import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureControlPlaneDurabilityPerformance } from "./control-plane-durability-fixture.js";

const outputPath = process.env["UNIFOLD_CONTROL_PLANE_DURABILITY_OUTPUT"];

it.runIf(outputPath !== undefined)(
  "writes control-plane durability performance gates",
  async () => {
    const evidence = await measureControlPlaneDurabilityPerformance();
    expect(evidence.gates.every(({ passed }) => passed)).toBe(true);
    await writeFile(String(outputPath), `${JSON.stringify(evidence, null, 2)}\n`);
  }
);
