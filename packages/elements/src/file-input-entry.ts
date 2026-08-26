import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldFileInput } from "./file-input.js";
import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistryPort } from "./register-types.js";

export { UnifoldFileInput } from "./file-input.js";

export function defineUnifoldFileInput(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.FileInput, UnifoldFileInput, registry);
}

function defaultRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
