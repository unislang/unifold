import { expect, it } from "vitest";

import type { JsonUiProfileValidationResult } from "./types.js";

it("keeps validation results data-only", () => {
  const result: JsonUiProfileValidationResult = { compatible: true, diagnostics: [] };
  expect(result.compatible).toBe(true);
});
