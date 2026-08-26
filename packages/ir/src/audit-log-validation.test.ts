import { CatalogConstraintKind } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { isAuditLogEntryList, validateAuditLogDataConstraint } from "./audit-log-validation.js";
import { DiagnosticCode } from "./enums.js";
import type { CompilerDiagnostic } from "./types.js";

const entry = (id = "event-1") => ({
  action: "updated",
  actor: "Ada Lovelace",
  id,
  summary: "Changed account status",
  timestamp: "2026-08-25T12:34:56.123Z"
});

it("accepts exact unique audit entries and an empty history", () => {
  expect(isAuditLogEntryList([])).toBe(true);
  expect(isAuditLogEntryList([{ ...entry(), correlationId: "request-1" }])).toBe(true);
});

it("rejects malformed, unsafe, and unbounded entries", () => {
  expect(isAuditLogEntryList([{ ...entry(), timestamp: "August 25" }])).toBe(false);
  expect(isAuditLogEntryList([{ ...entry(), timestamp: "2026-02-30T12:00:00Z" }])).toBe(false);
  expect(isAuditLogEntryList([{ ...entry(), id: "__proto__" }])).toBe(false);
  expect(isAuditLogEntryList([{ ...entry(), extra: "hidden" }])).toBe(false);
  expect(
    isAuditLogEntryList(Array.from({ length: 10_001 }, (_, index) => entry(`e-${index}`)))
  ).toBe(false);
});

it("reports every duplicate entry ID at its exact JSON pointer", () => {
  const diagnostics: CompilerDiagnostic[] = [];
  validateAuditLogDataConstraint(
    { entries: [entry(), entry()], id: "audit" },
    { entriesProperty: "entries", kind: CatalogConstraintKind.AuditLogData },
    "/view",
    diagnostics
  );
  expect(diagnostics).toEqual([
    expect.objectContaining({
      code: DiagnosticCode.DuplicateAuditLogEntryId,
      nodeId: "audit",
      path: "/view/entries/1/id"
    })
  ]);
});
