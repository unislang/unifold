import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { auditLogSidecar } from "./audit-log-sidecar.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";

it("pins AuditLog authorization, privacy, accessibility, and browser evidence", () => {
  expect(auditLogSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.AuditTimeline },
    componentType: CoreComponentType.AuditLog,
    testManifest: {
      browserScenarios: ["renders and safely revises a bounded authorized audit timeline"]
    }
  });
  expect(auditLogSidecar.privacy.sensitiveProperties).toContain("entries");
  expect(auditLogSidecar.testManifest.requirementIds).toContain(
    "SECURITY.AUDIT_LOG.AUTHORIZED_SOURCE"
  );
});
