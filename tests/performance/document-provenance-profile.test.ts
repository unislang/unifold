import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureDocumentProvenancePerformance } from "./document-provenance-fixture.js";

const outputPath = process.env["UNIFOLD_DOCUMENT_PROVENANCE_OUTPUT"];

it.runIf(outputPath !== undefined)("writes document provenance performance gates", async () => {
  const evidence = await measureDocumentProvenancePerformance();
  expect(evidence.gates.every(({ passed }) => passed)).toBe(true);
  await writeFile(String(outputPath), `${JSON.stringify(evidence, null, 2)}\n`);
});
