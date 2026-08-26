// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureErrorSummaryProjection } from "./form-structure-fixture.js";

const outputPath = process.env["UNIFOLD_FORM_STRUCTURE_OUTPUT"];

it.runIf(outputPath !== undefined)(
  "writes the bounded form-structure projection gate",
  async () => {
    const evidence = await measureErrorSummaryProjection();
    await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
    expect(evidence.gate.passed).toBe(true);
  }
);
