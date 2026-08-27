import "@unislang/unifold-theme/tokens.css";

import { mountStudioDogfood, type StudioDogfoodController } from "./studio-controller.js";
import "./example.css";

export async function startStudioDogfood(
  root: Document = document
): Promise<StudioDogfoodController> {
  const controller = await mountStudioDogfood({
    controls: requireElement(root, "studio-controls"),
    diff: requireElement(root, "proposal-diff"),
    exports: requireElement(root, "export-output"),
    live: requireElement(root, "live-preview"),
    preview: requireElement(root, "isolated-preview")
  });
  exposeModuleEvidence(controller);
  return controller;
}

function exposeModuleEvidence(controller: StudioDogfoodController): void {
  if (import.meta.env.MODE !== "e2e") return;
  document.documentElement.dataset["unifoldControlModuleIntegrity"] =
    controller.moduleIntegrities.controlSurface;
  document.documentElement.dataset["unifoldLiveModuleIntegrity"] =
    controller.moduleIntegrities.liveApplication;
}

function requireElement(root: Document, id: string): HTMLElement {
  const element = root.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing Studio element: ${id}.`);
  return element;
}

if (document.getElementById("studio-controls") instanceof HTMLElement) {
  void startStudioDogfood();
}
