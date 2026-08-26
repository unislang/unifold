import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldMasterDetail } from "./master-detail.js";
import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistrationResult, ElementRegistryPort } from "./register-types.js";

export { UnifoldMasterDetail } from "./master-detail.js";

export function defineUnifoldMasterDetail(
  registry: ElementRegistryPort | null = defaultElementRegistry()
): ElementRegistrationResult {
  return defineOptionalElement(CoreElementTag.MasterDetail, UnifoldMasterDetail, registry);
}

function defaultElementRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
