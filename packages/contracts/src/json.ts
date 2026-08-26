/** Values that can cross Unifold's JSON contract boundary. */
export type JsonPrimitive = boolean | null | number | string;

export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export type JsonArray = readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue | undefined;
}

export function isFiniteJsonNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isStepAlignedJsonNumber(value: number, base: number, step: number): boolean {
  if (step <= 0) return false;
  const quotient = (value - base) / step;
  const tolerance = Number.EPSILON * 8 * Math.max(1, Math.abs(quotient));
  return Math.abs(quotient - Math.round(quotient)) <= tolerance;
}

export const JSON_NUMBER_MINIMUM_ISSUE = 1;
export const JSON_NUMBER_MAXIMUM_ISSUE = 2;
export const JSON_NUMBER_STEP_ISSUE = 3;
export const JSON_NUMBER_RANGE_ISSUE = 4;

export type JsonNumberConstraintIssue = 1 | 2 | 3 | 4;

export function jsonNumberConstraintIssue(
  value: number | null,
  minimum: number | null,
  maximum: number | null,
  step: number
): JsonNumberConstraintIssue | undefined {
  const range = jsonNumberRangeIssue(minimum, maximum);
  if (range !== undefined) return range;
  return jsonNumberValueIssue(value, minimum, maximum, step);
}

function jsonNumberRangeIssue(
  minimum: number | null,
  maximum: number | null
): JsonNumberConstraintIssue | undefined {
  const invalid = [minimum !== null, maximum !== null, Number(minimum) > Number(maximum)].every(
    Boolean
  );
  return invalid ? JSON_NUMBER_RANGE_ISSUE : undefined;
}

function jsonNumberValueIssue(
  value: number | null,
  minimum: number | null,
  maximum: number | null,
  step: number
): JsonNumberConstraintIssue | undefined {
  if (value === null) return undefined;
  return nonNullNumberValueIssue(value, minimum, maximum, step);
}

function nonNullNumberValueIssue(
  value: number,
  minimum: number | null,
  maximum: number | null,
  step: number
): JsonNumberConstraintIssue | undefined {
  const bounds = jsonNumberBoundsIssue(value, minimum, maximum);
  if (bounds !== undefined) return bounds;
  return jsonNumberStepIssue(value, minimum, step);
}

function jsonNumberStepIssue(
  value: number,
  minimum: number | null,
  step: number
): JsonNumberConstraintIssue | undefined {
  return isStepAlignedJsonNumber(value, numberOr(minimum, 0), step)
    ? undefined
    : JSON_NUMBER_STEP_ISSUE;
}

function numberOr(value: number | null, fallback: number): number {
  return value === null ? fallback : value;
}

function jsonNumberBoundsIssue(
  value: number,
  minimum: number | null,
  maximum: number | null
): JsonNumberConstraintIssue | undefined {
  const issues: readonly [boolean, JsonNumberConstraintIssue][] = [
    [[minimum !== null, value < Number(minimum)].every(Boolean), JSON_NUMBER_MINIMUM_ISSUE],
    [[maximum !== null, value > Number(maximum)].every(Boolean), JSON_NUMBER_MAXIMUM_ISSUE]
  ];
  return issues.find(([invalid]) => invalid)?.[1];
}
