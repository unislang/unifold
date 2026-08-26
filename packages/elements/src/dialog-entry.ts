import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldDialog } from "./dialog.js";
import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistryPort } from "./register-types.js";

export { UnifoldDialog } from "./dialog.js";

export function defineUnifoldDialog(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.Dialog, UnifoldDialog, registry);
}

function defaultRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
