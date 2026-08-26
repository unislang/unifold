// @vitest-environment happy-dom
import {
  CoreComponentType,
  JsonUiUpstreamRevision,
  UiNodeKind,
  UiSchemaVersion
} from "@unislang/unifold-contracts";
import { UnifoldIrVersion, type UnifoldIrDocument, type UnifoldIrNode } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { captureStaticDomHydration } from "./hydration.js";
import { readStaticSwitchValue } from "./switch-hydration.js";

it("captures only an exact native ARIA switch contract", () => {
  const input = switchInput();
  expect(readStaticSwitchValue(node(), input, invalid)).toBe(true);
  input.setAttribute("role", "checkbox");
  expect(() => readStaticSwitchValue(node(), input, invalid)).toThrow("invalid switch");
  input.setAttribute("role", "switch");
  input.name = "tampered";
  expect(() => readStaticSwitchValue(node(), input, invalid)).toThrow("invalid switch");
  input.name = "notifications";
  input.type = "radio";
  expect(() => readStaticSwitchValue(node(), input, invalid)).toThrow("invalid switch");
});

it("rejects disabled and required-state tampering", () => {
  const input = switchInput();
  input.disabled = true;
  expect(() => readStaticSwitchValue(node(), input, invalid)).toThrow("invalid switch");
  input.disabled = false;
  input.required = false;
  expect(() => readStaticSwitchValue(node(), input, invalid)).toThrow("invalid switch");
});

it("migrates an edited boolean and captures the exact focused control", () => {
  const container = switchContainer();
  const input = requiredInput(container);
  input.checked = false;
  input.focus();
  expect(captureStaticDomHydration(documentFixture(), container)).toEqual({
    focusedControlIndex: 0,
    focusedNodeId: "notifications",
    values: { notifications: false }
  });
});

function switchInput(): HTMLInputElement {
  const input = document.createElement("input");
  Object.assign(input, { checked: true, name: "notifications", required: true, type: "checkbox" });
  input.setAttribute("role", "switch");
  return input;
}

function node(): UnifoldIrNode {
  return {
    childIds: [],
    componentType: CoreComponentType.Switch,
    eventBindings: {},
    id: "notifications",
    kind: UiNodeKind.Control,
    properties: { label: "Enable notifications", name: "notifications", required: true },
    scopePath: ["notifications"]
  };
}

function switchContainer(): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML =
    '<div data-unifold-static-document="switch-document" data-unifold-static-node-id="notifications" data-unifold-static-component="Switch"><input data-unifold-static-control="notifications" role="switch" type="checkbox" name="notifications" required checked></div>';
  document.body.append(container);
  return container;
}

function requiredInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Switch fixture is missing.");
  return input;
}

function documentFixture(): UnifoldIrDocument {
  return {
    compositionsByInstanceId: {},
    documentId: "switch-document",
    documentRevision: "1",
    irVersion: UnifoldIrVersion.Version1,
    machines: [],
    nodeIdentityAliases: {},
    nodesById: { notifications: node() },
    renderOrder: ["notifications"],
    rootNodeId: "notifications",
    rules: [],
    source: {
      documentSchemaVersion: UiSchemaVersion.Version1,
      jsonUiProfile: "test",
      jsonUiUpstreamRevision: JsonUiUpstreamRevision.Version01025
    },
    sourcePointersByNodeId: { notifications: "/view" },
    storesById: {}
  };
}

function invalid(): Error {
  return new Error("invalid switch");
}
