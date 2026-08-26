// @vitest-environment happy-dom
import type { JsonObject } from "@unislang/unifold-contracts";
import {
  CoreComponentType,
  UiNodeKind,
  UnifoldIrVersion,
  type UnifoldIrDocument
} from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { StaticDomHydrationError, captureStaticDomHydration } from "./hydration.js";

it("captures valid static values and focus without mutating the fallback DOM", () => {
  const container = staticContainer();
  const input = container.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Fixture input is missing.");
  input.value = "Grace";
  input.focus();
  const state = captureStaticDomHydration(irDocument(), container);
  expect(state).toEqual({ focusedNodeId: "name", values: { name: "Grace", role: "admin" } });
  expect(container.querySelector("input")).toBe(input);
});

it("rejects mismatched structure and unregistered choice values before mutation", () => {
  const mismatched = staticContainer();
  requireNodeElement(mismatched, "name").dataset["unifoldStaticComponent"] = "Button";
  expect(() => captureStaticDomHydration(irDocument(), mismatched)).toThrow(
    StaticDomHydrationError
  );

  const tampered = staticContainer();
  const option = tampered.ownerDocument.createElement("option");
  option.value = "owner";
  const select = tampered.querySelector("select");
  if (!(select instanceof HTMLSelectElement)) throw new Error("Fixture select is missing.");
  select.append(option);
  select.value = "owner";
  expect(() => captureStaticDomHydration(irDocument(), tampered)).toThrow(
    "Static choice value is invalid"
  );
});

it("captures checkbox, multi-select, radio, and text-area values", () => {
  expect(captureCheckbox()).toEqual({ name: true, role: "admin" });
  expect(captureMultiSelect()).toEqual({ name: "Ada", role: ["user", "admin"] });
  expect(captureRadioGroup()).toEqual({ name: "Ada", role: "user" });
  expect(captureTextArea()).toEqual({ name: "Notes", role: "admin" });
});

it("captures and validates the native combobox fallback selection", () => {
  const container = staticContainer();
  requireNodeElement(container, "role").dataset["unifoldStaticComponent"] =
    CoreComponentType.Combobox;
  const select = requireSelect(container);
  select.value = "admin";
  expect(
    captureStaticDomHydration(
      documentWithNode("role", CoreComponentType.Combobox, choiceProperties()),
      container
    ).values
  ).toEqual({ name: "Ada", role: "admin" });
});

it("captures an explicit empty native combobox fallback selection", () => {
  const container = staticContainer();
  requireNodeElement(container, "role").dataset["unifoldStaticComponent"] =
    CoreComponentType.Combobox;
  requireSelect(container).innerHTML = '<option value="" selected></option>';
  expect(
    captureStaticDomHydration(
      documentWithNode("role", CoreComponentType.Combobox, choiceProperties()),
      container
    ).values
  ).toEqual({ name: "Ada", role: "" });
});

it("rejects missing, duplicated, reordered, and reparented static nodes", () => {
  expectHydrationFailure(document.createElement("div"), "missing or duplicated");
  const duplicated = staticContainer();
  duplicated.append(requireNodeElement(duplicated, "form").cloneNode(true));
  expectHydrationFailure(duplicated, "missing or duplicated");
  const reordered = staticContainer();
  requireNodeElement(reordered, "name").dataset["unifoldStaticNodeId"] = "other";
  expectHydrationFailure(reordered, "node order differs");
  const reparented = staticContainer();
  requireNodeElement(reparented, "name").append(requireNodeElement(reparented, "role"));
  expectHydrationFailure(reparented, "parent differs");
});

it("rejects duplicated and unsupported value controls", () => {
  const duplicated = staticContainer();
  requireNodeElement(duplicated, "name").append(requireInput(duplicated).cloneNode(true));
  expectHydrationFailure(duplicated, "control is duplicated");
  const unsupported = staticContainer();
  requireInput(unsupported).replaceWith(markedButton("name"));
  expectHydrationFailure(unsupported, "control type is unsupported");
});

function captureCheckbox() {
  const container = staticContainer();
  const name = requireNodeElement(container, "name");
  name.dataset["unifoldStaticComponent"] = CoreComponentType.Checkbox;
  name.innerHTML = '<input type="checkbox" data-unifold-static-control="name" checked>';
  return captureStaticDomHydration(documentWithNode("name", CoreComponentType.Checkbox), container)
    .values;
}

function captureMultiSelect() {
  const container = staticContainer();
  requireNodeElement(container, "role").dataset["unifoldStaticComponent"] =
    CoreComponentType.MultiSelect;
  const select = requireSelect(container);
  select.multiple = true;
  [...select.options].forEach((option) => (option.selected = true));
  return captureStaticDomHydration(
    documentWithNode("role", CoreComponentType.MultiSelect, choiceProperties()),
    container
  ).values;
}

function captureRadioGroup() {
  const container = staticContainer();
  const role = requireNodeElement(container, "role");
  role.dataset["unifoldStaticComponent"] = CoreComponentType.RadioGroup;
  role.innerHTML =
    '<input type="radio" data-unifold-static-control="role" value="user" checked><input type="radio" data-unifold-static-control="role" value="admin">';
  return captureStaticDomHydration(
    documentWithNode("role", CoreComponentType.RadioGroup, choiceProperties()),
    container
  ).values;
}

function captureTextArea() {
  const container = staticContainer();
  const name = requireNodeElement(container, "name");
  name.dataset["unifoldStaticComponent"] = CoreComponentType.TextArea;
  name.innerHTML = '<textarea data-unifold-static-control="name">Notes</textarea>';
  return captureStaticDomHydration(documentWithNode("name", CoreComponentType.TextArea), container)
    .values;
}

function staticContainer(): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = `<form data-unifold-static-document="test" data-unifold-static-node-id="form" data-unifold-static-component="Form"><button data-unifold-static-control="form">Submit</button><label data-unifold-static-node-id="name" data-unifold-static-component="TextField">Name<input data-unifold-static-control="name" value="Ada"></label><label data-unifold-static-node-id="role" data-unifold-static-component="Select">Role<select data-unifold-static-control="role"><option value="user">User</option><option value="admin" selected>Admin</option></select></label></form>`;
  document.body.append(container);
  return container;
}

function irDocument(): UnifoldIrDocument {
  return {
    compositionsByInstanceId: {},
    documentId: "test",
    documentRevision: "1",
    irVersion: UnifoldIrVersion.Version1,
    machines: [],
    nodeIdentityAliases: {},
    nodesById: {
      form: node("form", CoreComponentType.Form, UiNodeKind.Form, ["name", "role"]),
      name: node("name", CoreComponentType.TextField, UiNodeKind.Control, [], "form"),
      role: node("role", CoreComponentType.Select, UiNodeKind.Control, [], "form", {
        options: [
          { label: "User", value: "user" },
          { label: "Admin", value: "admin" }
        ]
      })
    },
    renderOrder: ["form", "name", "role"],
    rootNodeId: "form",
    rules: [],
    source: {
      documentSchemaVersion: "1.0.0" as never,
      jsonUiProfile: "test",
      jsonUiUpstreamRevision: "test" as never
    },
    sourcePointersByNodeId: { form: "/view", name: "/view/$children/0", role: "/view/$children/1" },
    storesById: {}
  };
}

function documentWithNode(
  id: "name" | "role",
  componentType: CoreComponentType,
  properties: JsonObject = {}
): UnifoldIrDocument {
  const base = irDocument();
  const current = base.nodesById[id];
  if (current === undefined) throw new Error(`Fixture IR node is missing: ${id}.`);
  return {
    ...base,
    nodesById: { ...base.nodesById, [id]: { ...current, componentType, properties } }
  };
}

function choiceProperties(): JsonObject {
  return {
    options: [
      { label: "User", value: "user" },
      { label: "Admin", value: "admin" }
    ]
  };
}

function node(
  id: string,
  componentType: CoreComponentType,
  kind: UiNodeKind,
  childIds: readonly string[],
  parentId?: string,
  properties: Record<string, unknown> = {}
) {
  const value = {
    childIds,
    componentType,
    id,
    kind,
    properties,
    scopePath: scopePath(id, parentId)
  };
  return parentId === undefined ? (value as never) : ({ ...value, parentId } as never);
}

function scopePath(id: string, parentId?: string): readonly string[] {
  if (parentId === undefined) return [id];
  return [parentId, id];
}

function requireNodeElement(container: HTMLElement, id: string): HTMLElement {
  const element = [
    ...container.querySelectorAll<HTMLElement>("[data-unifold-static-node-id]")
  ].find((candidate) => candidate.dataset["unifoldStaticNodeId"] === id);
  if (element === undefined) throw new Error(`Static fixture node is missing: ${id}.`);
  return element;
}

function requireInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector("input[data-unifold-static-control='name']");
  if (!(input instanceof HTMLInputElement)) throw new Error("Fixture input is missing.");
  return input;
}

function requireSelect(container: HTMLElement): HTMLSelectElement {
  const select = container.querySelector("select");
  if (!(select instanceof HTMLSelectElement)) throw new Error("Fixture select is missing.");
  return select;
}

function markedButton(id: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.dataset["unifoldStaticControl"] = id;
  return button;
}

function expectHydrationFailure(container: HTMLElement, message: string): void {
  expect(() => captureStaticDomHydration(irDocument(), container)).toThrow(message);
}
