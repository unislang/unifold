const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
const DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334] as const;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const STEP_BASE_DATE = "1970-01-01";

export enum JsonDateConstraintIssue {
  Maximum = "maximum",
  Minimum = "minimum",
  Range = "range",
  StepAnchor = "step-anchor",
  Step = "step"
}

export function isJsonDateValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value === "") return true;
  return isCalendarDate(value);
}

export function jsonDateConstraintIssue(
  value: string,
  minimum: string,
  maximum: string,
  step: number
): JsonDateConstraintIssue | undefined {
  const structureIssue = dateStructureIssue(minimum, maximum, step);
  if (structureIssue !== undefined) return structureIssue;
  if (value === "") return undefined;
  return dateValueIssue(value, minimum, maximum, step);
}

function dateStructureIssue(
  minimum: string,
  maximum: string,
  step: number
): JsonDateConstraintIssue | undefined {
  const rangeIssue = dateRangeIssue(minimum, maximum);
  if (rangeIssue !== undefined) return rangeIssue;
  return dateStepAnchorIssue(minimum, step);
}

function dateStepAnchorIssue(minimum: string, step: number): JsonDateConstraintIssue | undefined {
  if (step > 1 && minimum === "") return JsonDateConstraintIssue.StepAnchor;
  return undefined;
}

function dateRangeIssue(minimum: string, maximum: string): JsonDateConstraintIssue | undefined {
  if ([minimum, maximum].includes("")) return undefined;
  if (minimum > maximum) return JsonDateConstraintIssue.Range;
  return undefined;
}

function dateValueIssue(
  value: string,
  minimum: string,
  maximum: string,
  step: number
): JsonDateConstraintIssue | undefined {
  const boundIssue = dateBoundIssue(value, minimum, maximum);
  if (boundIssue !== undefined) return boundIssue;
  if (!isDateStepAligned(value, minimum, step)) return JsonDateConstraintIssue.Step;
  return undefined;
}

function dateBoundIssue(
  value: string,
  minimum: string,
  maximum: string
): JsonDateConstraintIssue | undefined {
  if (isBeforeMinimum(value, minimum)) return JsonDateConstraintIssue.Minimum;
  if (isAfterMaximum(value, maximum)) return JsonDateConstraintIssue.Maximum;
  return undefined;
}

function isBeforeMinimum(value: string, minimum: string): boolean {
  return minimum !== "" && value < minimum;
}

function isAfterMaximum(value: string, maximum: string): boolean {
  return maximum !== "" && value > maximum;
}

function isDateStepAligned(value: string, minimum: string, step: number): boolean {
  const base = minimum === "" ? STEP_BASE_DATE : minimum;
  return (dateDay(value) - dateDay(base)) % step === 0;
}

function isCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (match === null) return false;
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  return validDateParts(year, month, day);
}

function validDateParts(year: number, month: number, day: number): boolean {
  if (year === 0) return false;
  if (!isCalendarMonth(month)) return false;
  return isCalendarDay(year, month, day);
}

function isCalendarMonth(month: number): boolean {
  return month >= 1 && month <= 12;
}

function isCalendarDay(year: number, month: number, day: number): boolean {
  return day >= 1 && day <= daysInMonth(year, month);
}

function dateDay(value: string): number {
  const match = DATE_PATTERN.exec(value);
  if (match === null) return Number.NaN;
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  return daysBeforeYear(year) + daysBeforeMonth(year, month) + day - 1;
}

function daysBeforeYear(year: number): number {
  const previousYear = year - 1;
  return (
    previousYear * 365 +
    Math.floor(previousYear / 4) -
    Math.floor(previousYear / 100) +
    Math.floor(previousYear / 400)
  );
}

function daysBeforeMonth(year: number, month: number): number {
  const days = DAYS_BEFORE_MONTH[month - 1] as number;
  if (month > 2 && isLeapYear(year)) return days + 1;
  return days;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1] as number;
}

function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}
