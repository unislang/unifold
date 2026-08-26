import { CoreElementTag } from "@unislang/unifold-catalog";

import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistryPort } from "./register-types.js";
import { UnifoldPopover } from "./popover.js";

export { UnifoldPopover } from "./popover.js";

export function defineUnifoldPopover(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.Popover, UnifoldPopover, registry);
}

function defaultRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
