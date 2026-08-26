import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldCard } from "./card.js";
import { UnifoldImage } from "./image.js";
import { defineOptionalElement } from "./optional-element-registration.js";
import type { ElementRegistryPort } from "./register-types.js";

export { UnifoldCard } from "./card.js";
export { UnifoldImage } from "./image.js";

export function defineUnifoldCard(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.Card, UnifoldCard, registry);
}

export function defineUnifoldImage(registry: ElementRegistryPort | null = defaultRegistry()) {
  return defineOptionalElement(CoreElementTag.Image, UnifoldImage, registry);
}

function defaultRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}
