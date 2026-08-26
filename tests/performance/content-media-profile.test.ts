// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureContentMediaProjection } from "./content-media-fixture.js";

const outputPath = process.env["UNIFOLD_CONTENT_MEDIA_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the bounded content/media projection gate", async () => {
  const evidence = await measureContentMediaProjection();
  await writeFile(outputPath as string, `${JSON.stringify(evidence, null, 2)}\n`);
  expect(evidence.gate.passed).toBe(true);
});
