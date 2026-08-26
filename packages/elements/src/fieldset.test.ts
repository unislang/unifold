// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldFieldset } from "./form-structure-entry.js";
import { UnifoldFieldset } from "./fieldset.js";

it("keeps descendants inside a native light-DOM fieldset", async () => {
  const group = createFieldset();
  group.id = "contact";
  group.label = "Contact details";
  group.helpText = "All fields are required.";
  group.disabled = true;
  const input = document.createElement("input");
  group.unifoldChildContainer.append(input);
  document.body.append(group);
  await group.updateComplete;

  const fieldset = requireFieldset(group);
  expect(fieldset.disabled).toBe(true);
  expect(fieldset.querySelector("legend")?.textContent).toBe("Contact details");
  expect(fieldset.getAttribute("aria-describedby")).toBe("contact__fieldset-help");
  expect(fieldset.contains(input)).toBe(true);
  expect(input.getRootNode()).toBe(document);
});

it("clears the optional help relationship", async () => {
  const group = createFieldset();
  document.body.append(group);
  await group.updateComplete;
  expect(group.querySelector("fieldset")?.hasAttribute("aria-describedby")).toBe(false);
});

function createFieldset(): UnifoldFieldset {
  defineUnifoldFieldset(customElements);
  return document.createElement(CoreElementTag.Fieldset) as UnifoldFieldset;
}

function requireFieldset(group: UnifoldFieldset): HTMLFieldSetElement {
  const fieldset = group.querySelector("fieldset");
  if (fieldset === null) throw new Error("Native fieldset is missing.");
  return fieldset;
}
