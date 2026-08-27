import { expect, it } from "vitest";

import { proposalSafetyDiagnostic } from "./proposal-safety.js";
import { UiPatchDiagnosticCode } from "./types.js";

it("accepts bounded plain JSON proposal data", () => {
  expect(
    proposalSafetyDiagnostic({ operations: [{ value: [true, null, "safe"] }] })
  ).toBeUndefined();
});

it("rejects excessive depth, strings, shared values, and unsafe nested keys", () => {
  expect(proposalSafetyDiagnostic(deepValue())).toMatchObject({
    code: UiPatchDiagnosticCode.InvalidProposal
  });
  expect(proposalSafetyDiagnostic("x".repeat(65_537))).toMatchObject({
    code: UiPatchDiagnosticCode.InvalidProposal
  });
  const shared = { safe: true };
  expect(proposalSafetyDiagnostic([shared, shared])).toMatchObject({
    code: UiPatchDiagnosticCode.InvalidProposal
  });
  expect(proposalSafetyDiagnostic(JSON.parse('{"value":{"__proto__":true}}'))).toMatchObject({
    code: UiPatchDiagnosticCode.InvalidProposal,
    path: "/value/__proto__"
  });
});

function deepValue(): unknown {
  let value: unknown = true;
  for (let index = 0; index < 66; index += 1) value = [value];
  return value;
}
