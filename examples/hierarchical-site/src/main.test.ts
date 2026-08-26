// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { mountHierarchicalExample, registerHierarchicalOptionalElements } from "./main.js";

it("mounts the hierarchical JSON through the public framework entry point", async () => {
  const container = document.createElement("div");
  const eventLog = document.createElement("pre");
  const machineState = document.createElement("output");
  document.body.append(container, eventLog, machineState);
  await registerHierarchicalOptionalElements();

  const controller = mountHierarchicalExample(container, eventLog, machineState);

  expect(container.querySelector("[data-unifold-node-id='contact-page']")).not.toBeNull();
  expect(nodeId(container, "unifold-dialog")).toBe("account-review-dialog");
  expect(nodeId(container, "unifold-search-field")).toBe("profile-search");
  expect(nodeId(container, "unifold-checkbox-group")).toBe("contact-topics");
  expect(nodeId(container, "unifold-switch")).toBe("contact-notifications");
  expect(controller.application.runtime.getSnapshot("show-summary").properties["disabled"]).toBe(
    true
  );
  expect(machineState.textContent).toBe("editing");
  controller.dispose();
  document.body.replaceChildren();
});

function nodeId(container: HTMLElement, selector: string): string | null {
  const element = container.querySelector(selector);
  return element === null ? null : element.getAttribute("data-unifold-node-id");
}
