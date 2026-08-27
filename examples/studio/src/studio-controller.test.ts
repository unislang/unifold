// @vitest-environment happy-dom
import { StudioSessionState } from "@unislang/unifold-studio";
import { expect, it } from "vitest";

import {
  mountStudioDogfood,
  type StudioDogfoodController,
  type StudioDogfoodTargets
} from "./studio-controller.js";

it("keeps preview isolated, applies explicitly, and renders both exports", async () => {
  const targets = studioTargets();
  const controller = await mountStudioDogfood(targets);
  const liveBefore = nodeContent(controller, "prototype-summary");

  const preview = await controller.generate("Make the summary concise and welcoming");
  expect(preview.state).toBe(StudioSessionState.PreviewReady);
  expect(nodeContent(controller, "prototype-summary")).toBe(liveBefore);
  expect(renderedNodeText(targets.preview, "prototype-summary")).toContain(
    "Local mock request: Make the summary concise"
  );
  expect(targets.diff.textContent).toContain("/view/$children/1/content");

  const applied = await controller.apply();
  expect(applied.state).toBe(StudioSessionState.Applied);
  expect(nodeContent(controller, "prototype-summary")).toContain(
    "Local mock request: Make the summary concise"
  );
  expect(targets.preview.querySelector("[data-unifold-node-id]")).toBeNull();

  await controller.export();
  expect(targets.exports.textContent).toContain("Portable JSON");
  expect(targets.exports.textContent).toContain("Static HTML");
  expect(targets.exports.querySelectorAll("a[download]")).toHaveLength(2);
  controller.dispose();
});

it("routes JSON-authored Generate activation through the unified event stream", async () => {
  const targets = studioTargets();
  const controller = await mountStudioDogfood(targets);
  const prompt = await innerControl<HTMLTextAreaElement>(
    targets.controls,
    "studio-prompt",
    "textarea"
  );
  prompt.value = "Clarify the local status";
  prompt.dispatchEvent(new InputEvent("input", { bubbles: true }));
  const generate = await innerControl<HTMLButtonElement>(
    targets.controls,
    "studio-generate",
    "button"
  );
  generate.click();
  await expect.poll(() => controller.snapshot.state).toBe(StudioSessionState.PreviewReady);
  expect(renderedNodeText(targets.preview, "prototype-summary")).toContain(
    "Clarify the local status"
  );
  controller.dispose();
});

it("routes an external edit canonically and preserves it after stale apply rejection", async () => {
  const targets = studioTargets();
  const controller = await mountStudioDogfood(targets);
  await controller.generate("Clarify the stale summary");
  const externalEdit = await innerControl<HTMLButtonElement>(
    targets.controls,
    "studio-external-edit",
    "button"
  );
  externalEdit.click();
  expect(nodeContent(controller, "prototype-summary")).toBe(
    "This summary was changed outside Studio."
  );
  expect((await controller.apply()).state).toBe(StudioSessionState.Failed);
  expect(nodeContent(controller, "prototype-summary")).toBe(
    "This summary was changed outside Studio."
  );
  expect(targets.diff.textContent).toContain("base-revision-mismatch");
  controller.dispose();
});

it("cancels a delayed request canonically without opening a preview", async () => {
  const targets = studioTargets();
  const controller = await mountStudioDogfood(targets);
  const pending = controller.generate("Wait before proposing the customer summary");
  controller.cancel();
  await pending;
  expect(controller.snapshot.state).toBe(StudioSessionState.Failed);
  expect(targets.diff.textContent).toContain("cancelled");
  expect(targets.preview.querySelector("[data-unifold-node-id]")).toBeNull();
  expect(nodeContent(controller, "prototype-summary")).toBe(
    "This is the currently applied experience."
  );
  controller.dispose();
});

it("reports guarded export unavailability without producing artifacts", async () => {
  const targets = studioTargets();
  const controller = await mountStudioDogfood(targets);
  await controller.export();
  expect(targets.diff.textContent).toContain("export-unavailable");
  expect(targets.exports.querySelectorAll("a[download]")).toHaveLength(0);
  expect(nodeContent(controller, "prototype-summary")).toBe(
    "This is the currently applied experience."
  );
  controller.dispose();
});

function studioTargets(): StudioDogfoodTargets {
  const targets = {
    controls: document.createElement("div"),
    diff: document.createElement("pre"),
    exports: document.createElement("div"),
    live: document.createElement("div"),
    preview: document.createElement("div")
  };
  document.body.append(...Object.values(targets));
  return targets;
}

async function innerControl<ElementType extends Element>(
  container: HTMLElement,
  nodeId: string,
  selector: string
): Promise<ElementType> {
  const host = requireHost(container, nodeId);
  await host.updateComplete;
  const control = requireShadow(host).querySelector(selector);
  if (control === null) throw new Error(`Missing ${selector}.`);
  return control as ElementType;
}

function requireHost(container: HTMLElement, nodeId: string): ReactiveHost {
  const host = container.querySelector(`[data-unifold-node-id="${nodeId}"]`);
  if (host === null) throw new Error(`Missing ${nodeId}.`);
  return host as ReactiveHost;
}

function requireShadow(host: ReactiveHost): ShadowRoot {
  const root = host.shadowRoot;
  if (root === null) throw new Error(`Missing ${host.localName} shadow root.`);
  return root;
}

function renderedNodeText(container: HTMLElement, nodeId: string): string {
  return requireShadow(requireHost(container, nodeId)).textContent ?? "";
}

function nodeContent(controller: StudioDogfoodController, nodeId: string): unknown {
  return controller.liveApplication.runtime.getSnapshot(nodeId).properties["content"];
}

interface ReactiveHost extends HTMLElement {
  readonly updateComplete: Promise<unknown>;
}
