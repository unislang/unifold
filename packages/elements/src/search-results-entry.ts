import { CoreElementTag } from "@unislang/unifold-catalog";

import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistrationResult, ElementRegistryPort } from "./register-types.js";
import { UnifoldSearchResults } from "./search-results.js";

export { UnifoldSearchResults } from "./search-results.js";

export function defineUnifoldSearchResults(
  registry: ElementRegistryPort | null = defaultElementRegistry()
): ElementRegistrationResult {
  return defineOptionalElement(CoreElementTag.SearchResults, UnifoldSearchResults, registry);
}

function defaultElementRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
