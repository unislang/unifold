// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { mountHierarchicalExample, registerHierarchicalOptionalElements } from "./main.js";

it("mounts the hierarchical JSON through the public framework entry point", async () => {
  const container = document.createElement("div");
  const eventLog = document.createElement("pre");
  const machineState = document.createElement("output");
  document.body.append(container, eventLog, machineState);
  await registerHierarchicalOptionalElements();

  const controller = await mountHierarchicalExample(container, eventLog, machineState);
  await Promise.resolve();

  expect(container.querySelector("[data-unifold-node-id='contact-page']")).not.toBeNull();
  expect(nodeId(container, "unifold-dialog")).toBe("account-review-dialog");
  expect(nodeId(container, "unifold-search-field")).toBe("profile-search");
  expect(nodeId(container, "unifold-checkbox-group")).toBe("contact-topics");
  expect(nodeId(container, "unifold-switch")).toBe("contact-notifications");
  expect(nodeId(container, "unifold-date-field")).toBe("contact-start-date");
  expect(nodeId(container, "unifold-toast")).toBe("profile-ready-toast");
  expect(nodeId(container, "unifold-pagination")).toBe("results-pagination");
  expect(controller.application.runtime.getSnapshot("show-summary").properties["disabled"]).toBe(
    true
  );
  expect(machineState.textContent).toBe("editing");
  expect(controller.moduleIntegrity).toMatch(/^sha256-/u);
  controller.dispose();
  document.body.replaceChildren();
});

function nodeId(container: HTMLElement, selector: string): string | null {
  const roots: readonly ParentNode[] = [container, ...shadowRoots(container)];
  const element = roots.map((root) => root.querySelector(selector)).find(Boolean);
  return element?.getAttribute("data-unifold-node-id") ?? null;
}

function shadowRoots(root: ParentNode): readonly ShadowRoot[] {
  return Array.from(root.querySelectorAll("*")).flatMap((element) =>
    element.shadowRoot === null ? [] : [element.shadowRoot]
  );
}
