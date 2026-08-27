import type { DomRenderController } from "@unislang/unifold-renderer-dom";

import type { UnifoldApplicationRendererPort } from "./types.js";

class ApplicationRendererFacade implements UnifoldApplicationRendererPort {
  readonly getElement: DomRenderController["getElement"];

  constructor(renderer: DomRenderController) {
    this.getElement = renderer.getElement.bind(renderer);
    Object.freeze(this);
  }
}

export function createApplicationRenderer(
  renderer: DomRenderController
): UnifoldApplicationRendererPort {
  return new ApplicationRendererFacade(renderer);
}
