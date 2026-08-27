import { expect, it } from "vitest";

import { JsonDateConstraintIssue, isJsonDateValue, jsonDateConstraintIssue } from "./date.js";

it.each(["", "0001-01-01", "2000-02-29", "2026-08-26", "9999-12-31"])(
  "accepts canonical JSON date value %s",
  (value) => expect(isJsonDateValue(value)).toBe(true)
);

it.each(["0000-01-01", "2025-02-29", "2026-2-03", "2026-13-01", "not-a-date", null])(
  "rejects non-calendar JSON date value %s",
  (value) => expect(isJsonDateValue(value)).toBe(false)
);

it("reports range, bounds, and whole-day step issues", () => {
  expect(jsonDateConstraintIssue("", "2026-12-01", "2026-01-01", 1)).toBe(
    JsonDateConstraintIssue.Range
  );
  expect(jsonDateConstraintIssue("2025-12-31", "2026-01-01", "", 1)).toBe(
    JsonDateConstraintIssue.Minimum
  );
  expect(jsonDateConstraintIssue("2027-01-01", "", "2026-12-31", 1)).toBe(
    JsonDateConstraintIssue.Maximum
  );
  expect(jsonDateConstraintIssue("2026-01-02", "2026-01-01", "", 2)).toBe(
    JsonDateConstraintIssue.Step
  );
  expect(jsonDateConstraintIssue("", "", "", 2)).toBe(JsonDateConstraintIssue.StepAnchor);
  expect(jsonDateConstraintIssue("2026-01-03", "2026-01-01", "", 2)).toBeUndefined();
});
