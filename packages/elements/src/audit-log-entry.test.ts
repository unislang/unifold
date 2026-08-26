// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldAuditLog } from "./audit-log-entry.js";

it("registers the deferred AuditLog family", () => {
  expect(defineUnifoldAuditLog(customElements)).toMatchObject({
    definedTags: [CoreElementTag.AuditLog],
    status: "registered"
  });
});
