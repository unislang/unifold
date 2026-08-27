import { CoreElementTag } from "@unislang/unifold-catalog";

import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistryPort } from "./register-types.js";
import { UnifoldToast } from "./toast.js";

export function defineUnifoldToast(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.Toast, UnifoldToast, registry);
}

function defaultRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
