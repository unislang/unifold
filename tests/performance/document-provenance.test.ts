import { expect, it } from "vitest";

import { measureDocumentProvenancePerformance } from "./document-provenance-fixture.js";

it("governs exact signed loads and revoked denials within bounded gates", async () => {
  const evidence = await measureDocumentProvenancePerformance(1);
  expect(evidence.verified).toEqual({ accepted: true, revoked: true });
  expect(evidence.auditCounts).toEqual([{ accepted: 1_000, revoked: 1_000 }]);
  expect(
    evidence.gates.every(({ passed }) => passed),
    JSON.stringify(evidence.gates)
  ).toBe(true);
});
