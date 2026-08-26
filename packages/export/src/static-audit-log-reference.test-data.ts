import type { JsonObject } from "@unislang/unifold-contracts";

export function referenceAuditLogNode(): JsonObject {
  return {
    $comp: "AuditLog",
    entries: [
      {
        action: "updated",
        actor: "Ada",
        correlationId: "request-1",
        id: "event-1",
        summary: "Updated the profile",
        timestamp: "2026-08-25T12:00:00Z"
      }
    ],
    id: "audit-log",
    label: "Account history"
  };
}
