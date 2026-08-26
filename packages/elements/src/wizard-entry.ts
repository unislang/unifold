import { CoreElementTag } from "@unislang/unifold-catalog";

import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistrationResult, ElementRegistryPort } from "./register-types.js";
import { UnifoldWizard } from "./wizard.js";

export { UnifoldWizard } from "./wizard.js";

export function defineUnifoldWizard(
  registry: ElementRegistryPort | null = defaultElementRegistry()
): ElementRegistrationResult {
  return defineOptionalElement(CoreElementTag.Wizard, UnifoldWizard, registry);
}

function defaultElementRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
