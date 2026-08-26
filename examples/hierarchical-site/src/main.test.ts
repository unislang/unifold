// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { mountHierarchicalExample } from "./main.js";

it("mounts the hierarchical JSON through the public framework entry point", () => {
  const container = document.createElement("div");
  const eventLog = document.createElement("pre");
  const machineState = document.createElement("output");
  document.body.append(container, eventLog, machineState);

  const controller = mountHierarchicalExample(container, eventLog, machineState);

  expect(container.querySelector("[data-unifold-node-id='contact-page']")).not.toBeNull();
  expect(container.querySelector("unifold-dialog")?.getAttribute("data-unifold-node-id")).toBe(
    "account-review-dialog"
  );
  expect(controller.application.runtime.getSnapshot("show-summary").properties["disabled"]).toBe(
    true
  );
  expect(machineState.textContent).toBe("editing");
  controller.dispose();
  document.body.replaceChildren();
});
