import { CoreElementTag } from "@unislang/unifold-catalog";

import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistryPort } from "./register-types.js";
import { UnifoldSwitch } from "./switch.js";

export function defineUnifoldSwitch(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.Switch, UnifoldSwitch, registry);
}

function defaultRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
