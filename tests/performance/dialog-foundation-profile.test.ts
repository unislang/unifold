// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { measureDialogFoundations } from "./dialog-foundation-fixture.js";

const outputPath = process.env["UNIFOLD_DIALOG_FOUNDATION_OUTPUT"];

it.runIf(outputPath !== undefined)(
  "compares native, Lion, and Spectrum Dialog foundations",
  async () => {
    const evidence = await measureDialogFoundations();
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`)
    );
    expect(evidence.gate.passed).toBe(true);
    expect(evidence.candidates.lion.gzipBytes).toBeGreaterThan(
      evidence.candidates.native.gzipBytes
    );
    expect(evidence.candidates.spectrum.gzipBytes).toBeGreaterThan(
      evidence.candidates.native.gzipBytes
    );
  }
);
