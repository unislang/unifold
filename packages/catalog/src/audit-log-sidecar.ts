import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode as node } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const auditLogSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Preserves the authorized authored order without implying a durable browser audit store",
    "Renders at most 200 entries from a 10,000-entry history",
    "Exposes timestamps through native time elements without announcing mounted history as live"
  ],
  browserScenarios: ["renders and safely revises a bounded authorized audit timeline"],
  componentType: CoreComponentType.AuditLog,
  example: node(CoreComponentType.AuditLog, "account-audit", {
    entries: [
      {
        action: "updated",
        actor: "Ada Lovelace",
        correlationId: "request-1",
        id: "event-1",
        summary: "Changed account status",
        timestamp: "2026-08-25T12:34:56Z"
      }
    ],
    label: "Account history"
  }),
  pattern: ComponentAccessibilityPattern.AuditTimeline,
  purpose:
    "Present an authorized, read-only audit history supplied by a durable server-side audit source.",
  requirementIds: [
    "A11Y.AUDIT_LOG.TIMELINE",
    "PERF.AUDIT_LOG.BOUNDED_DOM",
    "SECURITY.AUDIT_LOG.AUTHORIZED_SOURCE",
    "SECURITY.AUDIT_LOG.ESCAPED_CONTENT"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["emptyMessage", "entries", "label"]
});
