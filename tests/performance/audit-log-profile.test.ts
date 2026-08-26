// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { expect, it } from "vitest";

import { measureAuditLogPerformance } from "./audit-log-fixture.js";

const outputPath = process.env["UNIFOLD_AUDIT_LOG_OUTPUT"];

it.runIf(outputPath !== undefined)("writes the 10k-entry AuditLog performance gates", async () => {
  const evidence = await measureAuditLogPerformance();
  expect(evidence.maximumRenderedEntries).toBeLessThanOrEqual(evidence.renderedEntryLimit);
  expect(evidence.gates.every(({ passed }) => passed)).toBe(true);
  await writeFile(String(outputPath), `${JSON.stringify(evidence, null, 2)}\n`);
});
