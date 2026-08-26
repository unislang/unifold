// @vitest-environment happy-dom
import { expect, it } from "vitest";

import {
  AUDIT_RENDERED_ENTRY_LIMIT,
  disposeAuditLog,
  mountAuditLog,
  scrollAuditLog
} from "./audit-log-fixture.js";

it("scrolls a 10k authorized audit history within an exact bounded DOM", async () => {
  const mounted = await mountAuditLog();
  try {
    const evidence = await scrollAuditLog(mounted);
    expect(evidence.renderedEntries).toBeLessThanOrEqual(AUDIT_RENDERED_ENTRY_LIMIT);
    expect(evidence.firstRenderedId).toBe("event-9896");
  } finally {
    disposeAuditLog(mounted);
  }
});
