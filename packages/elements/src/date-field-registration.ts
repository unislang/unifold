import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldDateField } from "./date-field.js";
import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistryPort } from "./register-types.js";

export function defineUnifoldDateField(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.DateField, UnifoldDateField, registry);
}

function defaultRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
