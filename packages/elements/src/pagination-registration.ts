import { CoreElementTag } from "@unislang/unifold-catalog";

import { defineOptionalElement } from "./optional-element-registration.js";
import { UnifoldPagination } from "./pagination.js";
import type { ElementRegistryPort } from "./register-types.js";

export function defineUnifoldPagination(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.Pagination, UnifoldPagination, registry);
}

function defaultRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
