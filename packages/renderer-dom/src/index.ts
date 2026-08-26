export { renderIrDocument } from "./renderer.js";
export {
  StaticDomHydrationError,
  captureStaticDomHydration,
  type StaticDomHydrationState
} from "./hydration.js";
export { createNodeSnapshot } from "./snapshot.js";
export type {
  DomRenderController,
  DomRendererOptions,
  PendingElementDefinitionOptions,
  UnifoldElementHost
} from "./types.js";
