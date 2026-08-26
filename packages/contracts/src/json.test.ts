import { describe, expect, it } from "vitest";
import * as subject from "./json.js";

describe("json module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });

  it("recognizes finite JSON numbers and tolerant decimal-step alignment", () => {
    expect(subject.isFiniteJsonNumber(1)).toBe(true);
    expect(subject.isFiniteJsonNumber(Number.NaN)).toBe(false);
    expect(subject.isStepAlignedJsonNumber(0.3, 0.1, 0.1)).toBe(true);
    expect(subject.isStepAlignedJsonNumber(0.35, 0.1, 0.1)).toBe(false);
    expect(subject.isStepAlignedJsonNumber(1, 0, 0)).toBe(false);
    expect(subject.jsonNumberConstraintIssue(-1, 0, 10, 1)).toBe(subject.JSON_NUMBER_MINIMUM_ISSUE);
    expect(subject.jsonNumberConstraintIssue(11, 0, 10, 1)).toBe(subject.JSON_NUMBER_MAXIMUM_ISSUE);
    expect(subject.jsonNumberConstraintIssue(3, 0, 10, 2)).toBe(subject.JSON_NUMBER_STEP_ISSUE);
    expect(subject.jsonNumberConstraintIssue(null, 0, 10, 1)).toBeUndefined();
  });
});
