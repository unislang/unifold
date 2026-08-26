import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldBreadcrumb } from "./breadcrumb.js";
import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistryPort } from "./register-types.js";

export { UnifoldBreadcrumb } from "./breadcrumb.js";

export function defineUnifoldBreadcrumb(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.Breadcrumb, UnifoldBreadcrumb, registry);
}

function defaultRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
