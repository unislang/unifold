// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldAuditLog } from "./audit-log.js";

it("exposes the optional AuditLog family from Unifold", () => {
  expect(defineUnifoldAuditLog(customElements).definedTags).toEqual([CoreElementTag.AuditLog]);
});
