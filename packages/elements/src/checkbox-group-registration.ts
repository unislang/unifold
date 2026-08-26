import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldCheckboxGroup } from "./checkbox-group.js";
import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistryPort } from "./register-types.js";

export function defineUnifoldCheckboxGroup(
  registry: ElementRegistryPort | null = defaultRegistry()
) {
  return defineOptionalElement(CoreElementTag.CheckboxGroup, UnifoldCheckboxGroup, registry);
}

function defaultRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
