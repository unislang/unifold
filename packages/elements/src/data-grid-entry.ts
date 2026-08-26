import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldDataGrid } from "./data-grid.js";
import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistrationResult, ElementRegistryPort } from "./register-types.js";

export { UnifoldDataGrid } from "./data-grid.js";

export function defineUnifoldDataGrid(
  registry: ElementRegistryPort | null = defaultElementRegistry()
): ElementRegistrationResult {
  return defineOptionalElement(CoreElementTag.DataGrid, UnifoldDataGrid, registry);
}

function defaultElementRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
