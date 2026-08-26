import { CoreElementTag } from "@unislang/unifold-catalog";

import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistryPort } from "./register-types.js";
import { UnifoldSearchField } from "./search-field.js";

export function defineUnifoldSearchField(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.SearchField, UnifoldSearchField, registry);
}

function defaultRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
