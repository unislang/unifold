// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { startStudioDogfood } from "./main.js";

it("mounts the JSON-authored Studio and two distinct application containers", async () => {
  installShell();
  const controller = await startStudioDogfood();
  expect(document.querySelector("#studio-controls unifold-text-area")).not.toBeNull();
  expect(
    document.querySelector("#live-preview [data-unifold-node-id='prototype-page']")
  ).not.toBeNull();
  expect(document.querySelector("#isolated-preview [data-unifold-node-id]")).toBeNull();
  expect(controller.moduleIntegrities.controlSurface).toMatch(/^sha256-/u);
  expect(controller.moduleIntegrities.liveApplication).toMatch(/^sha256-/u);
  controller.dispose();
});

function installShell(): void {
  document.body.replaceChildren();
  ["studio-controls", "proposal-diff", "export-output", "live-preview", "isolated-preview"].forEach(
    (id) => {
      const element = document.createElement(id === "proposal-diff" ? "pre" : "div");
      element.id = id;
      document.body.append(element);
    }
  );
}
