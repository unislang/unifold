import { expect, it } from "vitest";

import { addProfileDiagnostic, asJsonRecord, escapeJsonPointer } from "./diagnostic-helpers.js";
import { JsonUiProfileDiagnosticCode, JsonUiProfileLimit } from "./enums.js";
import type { JsonUiProfileDiagnostic } from "./types.js";

it("recognizes records without accepting arrays or null", () => {
  expect(asJsonRecord({ value: true })).toEqual({ value: true });
  expect(asJsonRecord([])).toBeUndefined();
  expect(asJsonRecord(null)).toBeUndefined();
});

it("escapes JSON Pointer segments", () => {
  expect(escapeJsonPointer("a~/b")).toBe("a~0~1b");
});

it("bounds diagnostic accumulation", () => {
  const diagnostics: JsonUiProfileDiagnostic[] = Array.from(
    { length: JsonUiProfileLimit.Diagnostics },
    (_, index) => diagnostic(String(index))
  );
  addProfileDiagnostic(diagnostic("overflow"), diagnostics);
  expect(diagnostics).toHaveLength(JsonUiProfileLimit.Diagnostics);
});

function diagnostic(path: string): JsonUiProfileDiagnostic {
  return { code: JsonUiProfileDiagnosticCode.InvalidView, message: "invalid", path };
}
