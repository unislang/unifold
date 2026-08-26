import { JsonUiProfileLimit } from "./enums.js";
import type { JsonUiProfileDiagnostic } from "./types.js";

export function addProfileDiagnostic(
  diagnostic: JsonUiProfileDiagnostic,
  diagnostics: JsonUiProfileDiagnostic[]
): void {
  if (diagnostics.length >= JsonUiProfileLimit.Diagnostics) return;
  diagnostics.push(diagnostic);
}

export function asJsonRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!isObject(value)) return undefined;
  if (Array.isArray(value)) return undefined;
  return value as Readonly<Record<string, unknown>>;
}

export function escapeJsonPointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}
