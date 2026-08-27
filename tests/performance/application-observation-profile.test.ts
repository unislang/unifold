import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureApplicationObservation } from "./application-observation-fixture.js";

const outputPath = process.env["UNIFOLD_APPLICATION_OBSERVATION_OUTPUT"];

it.runIf(outputPath !== undefined)(
  "writes the application observation performance gate",
  async () => {
    const evidence = measureApplicationObservation();
    expect(evidence.gate.passed, JSON.stringify(evidence.gate)).toBe(true);
    await writeFile(String(outputPath), `${JSON.stringify(evidence, null, 2)}\n`);
  }
);
