import type { ChoiceOption } from "@unislang/unifold-catalog";

import type {
  NativeFormValueAdapter,
  NativeFormValueProjection,
  NativeFormSubmissionValue
} from "./native-form-control-controller.js";

const MAXIMUM_FORM_STATE_LENGTH = 65_536;

export enum NativeBooleanFormState {
  Checked = "true",
  Unchecked = "false"
}

export enum NativeBooleanSubmissionValue {
  Checked = "on"
}

export const scalarFormValueAdapter: NativeFormValueAdapter<string> = Object.freeze({
  clone: (value: string) => value,
  equals: (left: string, right: string) => left === right,
  isValueMissing: (value: string) => value.length === 0,
  project: (value: string, name: string) => projection(successfulScalar(name, value), value),
  restore: (state: string) => boundedState(state)
});

export const numberFormValueAdapter: NativeFormValueAdapter<number | null> = Object.freeze({
  clone: canonicalNumber,
  equals: (left: number | null, right: number | null) => left === right,
  isValueMissing: (value: number | null) => value === null,
  project: (value: number | null, name: string) => {
    const canonical = canonicalNumber(value);
    return projection(successfulNumber(name, canonical), stringify(canonical));
  },
  restore: restoreNumber
});

export const booleanFormValueAdapter: NativeFormValueAdapter<boolean> = Object.freeze({
  clone: (value: boolean) => value,
  equals: (left: boolean, right: boolean) => left === right,
  isValueMissing: (value: boolean) => !value,
  project: (value: boolean, name: string) =>
    projection(successfulBoolean(name, value), booleanState(value)),
  restore: restoreBoolean
});

export function createStringArrayFormValueAdapter(
  options: () => readonly ChoiceOption[]
): NativeFormValueAdapter<readonly string[]> {
  return {
    clone: cloneStrings,
    equals: equalStrings,
    isValueMissing: (value) => enabledSelections(value, options()).length === 0,
    project: (value, name) =>
      projection(repeatedStrings(name, enabledSelections(value, options())), stringify(value)),
    restore: (state) => restoreStrings(state, options())
  };
}

function successfulScalar(name: string, value: string): NativeFormSubmissionValue {
  return name.length === 0 ? null : value;
}

function successfulBoolean(name: string, value: boolean): NativeFormSubmissionValue {
  return name.length > 0 && value ? NativeBooleanSubmissionValue.Checked : null;
}

function successfulNumber(name: string, value: number | null): NativeFormSubmissionValue {
  if (name.length === 0) return null;
  return value === null ? "" : String(value);
}

function booleanState(value: boolean): NativeBooleanFormState {
  return value ? NativeBooleanFormState.Checked : NativeBooleanFormState.Unchecked;
}

function restoreBoolean(state: string): boolean | undefined {
  if (state === NativeBooleanFormState.Checked) return true;
  if (state === NativeBooleanFormState.Unchecked) return false;
  return undefined;
}

function restoreNumber(state: string): number | null | undefined {
  const value = parseState(state);
  if (value === null) return null;
  if (isFiniteNumber(value)) return value;
  return undefined;
}

function isFiniteNumber(value: unknown): value is number {
  return [typeof value === "number", Number.isFinite(Number(value))].every(Boolean);
}

function canonicalNumber(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function repeatedStrings(name: string, values: readonly string[]): FormData | null {
  if (name.length === 0 || values.length === 0) return null;
  const data = new FormData();
  values.forEach((value) => data.append(name, value));
  return data;
}

function enabledSelections(
  values: readonly string[],
  options: readonly ChoiceOption[]
): readonly string[] {
  if (!validCurrentSelection(values, options)) return [];
  const enabled = new Set(
    options.filter(({ disabled }) => disabled !== true).map(({ value }) => value)
  );
  return values.filter((value) => enabled.has(value));
}

function validCurrentSelection(
  value: readonly string[],
  options: readonly ChoiceOption[]
): boolean {
  const declared = new Set(options.map(({ value }) => value));
  return new Set(value).size === value.length && value.every((item) => declared.has(item));
}

function restoreStrings(
  state: string,
  options: readonly ChoiceOption[]
): readonly string[] | undefined {
  const value = readStringArray(state);
  return value !== undefined && validRestoredSelection(value, options)
    ? cloneStrings(value)
    : undefined;
}

function readStringArray(state: string): readonly string[] | undefined {
  const value = parseState(state);
  if (!Array.isArray(value)) return undefined;
  return value.every((item) => typeof item === "string") ? value : undefined;
}

function validRestoredSelection(
  value: readonly string[],
  options: readonly ChoiceOption[]
): boolean {
  const enabled = new Set(
    options.filter(({ disabled }) => disabled !== true).map(({ value }) => value)
  );
  return new Set(value).size === value.length && value.every((item) => enabled.has(item));
}

function parseState(state: string): unknown {
  if (state.length > MAXIMUM_FORM_STATE_LENGTH) return undefined;
  try {
    return JSON.parse(state) as unknown;
  } catch {
    return undefined;
  }
}

function boundedState(state: string): string | undefined {
  return state.length <= MAXIMUM_FORM_STATE_LENGTH ? state : undefined;
}

function stringify(value: unknown): string {
  return JSON.stringify(value);
}

function projection(
  submission: NativeFormSubmissionValue,
  state: string
): NativeFormValueProjection {
  return { state, submission };
}

function cloneStrings(value: readonly string[]): readonly string[] {
  return Object.freeze([...value]);
}

function equalStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
