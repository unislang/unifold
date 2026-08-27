import { expect, it } from "vitest";

import { moduleSafetyDiagnostic } from "./module-safety.js";
import { UiModuleDiagnosticCode } from "./types.js";

it("accepts bounded plain JSON", () => {
  expect(moduleSafetyDiagnostic({ valid: [null, true, 1, "text"] })).toBeUndefined();
});

it("rejects a non-finite number", () => {
  expect(moduleSafetyDiagnostic({ invalid: Number.NaN })?.code).toBe(
    UiModuleDiagnosticCode.UnsafeValue
  );
});

it("rejects a shared value", () => {
  const shared = { value: true };
  expect(moduleSafetyDiagnostic({ left: shared, right: shared })?.code).toBe(
    UiModuleDiagnosticCode.UnsafeValue
  );
});

it("enforces the string ceiling before schema parsing", () => {
  expect(moduleSafetyDiagnostic({ value: "x".repeat(65_537) })?.code).toBe(
    UiModuleDiagnosticCode.ModuleLimitExceeded
  );
});

it("enforces the recursive depth ceiling before schema parsing", () => {
  let nested: unknown = true;
  for (let index = 0; index < 66; index += 1) nested = [nested];
  expect(moduleSafetyDiagnostic(nested)?.code).toBe(UiModuleDiagnosticCode.ModuleLimitExceeded);
});
