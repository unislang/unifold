import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldErrorSummary } from "./error-summary.js";
import { UnifoldField } from "./field.js";
import { UnifoldFieldset } from "./fieldset.js";
import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistryPort } from "./register-types.js";

export { UnifoldErrorSummary } from "./error-summary.js";
export { UnifoldField } from "./field.js";
export { UnifoldFieldset } from "./fieldset.js";

export function defineUnifoldErrorSummary(
  registry: ElementRegistryPort | null = defaultRegistry()
) {
  return defineOptionalElement(CoreElementTag.ErrorSummary, UnifoldErrorSummary, registry);
}

export function defineUnifoldField(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.Field, UnifoldField, registry);
}

export function defineUnifoldFieldset(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.Fieldset, UnifoldFieldset, registry);
}

function defaultRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
