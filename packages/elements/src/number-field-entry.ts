import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldNumberField } from "./number-field.js";
import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistryPort } from "./register-types.js";

export { UnifoldNumberField } from "./number-field.js";

export function defineUnifoldNumberField(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.NumberField, UnifoldNumberField, registry);
}

function defaultRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
