import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldCombobox } from "./combobox.js";
import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistrationResult, ElementRegistryPort } from "./register-types.js";

export { UnifoldCombobox } from "./combobox.js";

export function defineUnifoldCombobox(
  registry: ElementRegistryPort | null = defaultElementRegistry()
): ElementRegistrationResult {
  return defineOptionalElement(CoreElementTag.Combobox, UnifoldCombobox, registry);
}

function defaultElementRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
