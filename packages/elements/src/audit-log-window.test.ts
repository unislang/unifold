import { expect, it } from "vitest";

import { auditLogWindow, MAX_RENDERED_AUDIT_ENTRIES } from "./audit-log-window.js";

it("bounds a 10k audit history and follows distant scroll positions", () => {
  const first = auditLogWindow({
    entryCount: 10_000,
    itemHeight: 1,
    overscan: 100,
    scrollTop: 0,
    viewportHeight: 1_000
  });
  const distant = auditLogWindow({
    entryCount: 10_000,
    itemHeight: 1,
    overscan: 100,
    scrollTop: 9_000,
    viewportHeight: 1_000
  });
  expect(first).toEqual({ end: MAX_RENDERED_AUDIT_ENTRIES, start: 0 });
  expect(distant).toEqual({ end: 9_100, start: 8_900 });
});
