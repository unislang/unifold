import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldAuditLog } from "./audit-log.js";
import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistrationResult, ElementRegistryPort } from "./register-types.js";

export { UnifoldAuditLog } from "./audit-log.js";

export function defineUnifoldAuditLog(
  registry: ElementRegistryPort | null = defaultElementRegistry()
): ElementRegistrationResult {
  return defineOptionalElement(CoreElementTag.AuditLog, UnifoldAuditLog, registry);
}

function defaultElementRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
