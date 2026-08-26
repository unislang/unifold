import {
  CatalogConstraintKind,
  type AuditLogEntry,
  type CatalogConstraintDescriptor
} from "@unislang/unifold-catalog";

import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import { isTableIdentifier } from "./table-data-validation.js";
import type { CompilerDiagnostic } from "./types.js";

const MAX_ENTRIES = 10_000;
const MAX_LABEL_LENGTH = 512;
const MAX_SUMMARY_LENGTH = 4_096;
const entryKeys = new Set(["action", "actor", "correlationId", "id", "summary", "timestamp"]);
const RFC_3339 =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/u;

export function isAuditLogEntryList(value: unknown): value is readonly AuditLogEntry[] {
  return Array.isArray(value) && value.length <= MAX_ENTRIES && value.every(isAuditLogEntry);
}

export function validateAuditLogDataConstraint(
  node: Readonly<Record<string, unknown>>,
  constraint: CatalogConstraintDescriptor,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  if (constraint.kind !== CatalogConstraintKind.AuditLogData) return;
  const entries = node[constraint.entriesProperty];
  if (!isAuditLogEntryList(entries)) return;
  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    if (seen.has(entry.id)) {
      diagnostics.push(
        errorDiagnostic(
          DiagnosticCode.DuplicateAuditLogEntryId,
          `Audit entry id "${entry.id}" is already defined.`,
          `${path}/${constraint.entriesProperty}/${index}/id`,
          nodeId(node)
        )
      );
    }
    seen.add(entry.id);
  });
}

function isAuditLogEntry(value: unknown): value is AuditLogEntry {
  if (!isPlainObject(value)) return false;
  return [
    Object.keys(value).every((key) => entryKeys.has(key)),
    isTableIdentifier(value["id"]),
    isTimestamp(value["timestamp"]),
    nonEmptyBoundedString(value["actor"], MAX_LABEL_LENGTH),
    nonEmptyBoundedString(value["action"], MAX_LABEL_LENGTH),
    nonEmptyBoundedString(value["summary"], MAX_SUMMARY_LENGTH),
    optionalIdentifier(value["correlationId"])
  ].every(Boolean);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && validTimestamp(value);
}

function validTimestamp(value: string): boolean {
  if (!RFC_3339.test(value)) return false;
  return validCalendarDate(value) && Number.isFinite(Date.parse(value));
}

function validCalendarDate(value: string): boolean {
  const date = value.slice(0, 10);
  return new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
}

function nonEmptyBoundedString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function optionalIdentifier(value: unknown): boolean {
  return value === undefined || isTableIdentifier(value);
}

function nodeId(node: Readonly<Record<string, unknown>>): string | undefined {
  return typeof node["id"] === "string" ? node["id"] : undefined;
}
