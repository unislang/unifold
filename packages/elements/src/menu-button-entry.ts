import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldMenuButton } from "./menu-button.js";
import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistrationResult, ElementRegistryPort } from "./register-types.js";

export { UnifoldMenuButton } from "./menu-button.js";

export function defineUnifoldMenuButton(
  registry: ElementRegistryPort | null = defaultElementRegistry()
): ElementRegistrationResult {
  return defineOptionalElement(CoreElementTag.MenuButton, UnifoldMenuButton, registry);
}

function defaultElementRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
