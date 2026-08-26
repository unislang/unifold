// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldField } from "./form-structure-entry.js";
import { UnifoldField } from "./field.js";

it("keeps one child in a synchronous light-DOM field group", async () => {
  const field = createField();
  field.id = "name-field";
  field.label = "Name";
  field.helpText = "Use your legal name.";
  field.errorMessage = "Enter a name.";
  field.required = true;
  const input = document.createElement("input");
  field.unifoldChildContainer.append(input);
  document.body.append(field);
  await field.updateComplete;

  const group = field.querySelector<HTMLElement>("[role=group]");
  expect(group?.getAttribute("aria-labelledby")).toBe("name-field__field-label");
  expect(group?.getAttribute("aria-describedby")).toBe(
    "name-field__field-help name-field__field-error"
  );
  expect(field.textContent).toContain("Name (required)");
  expect(field.textContent).toContain("Use your legal name.");
  expect(field.textContent).toContain("Enter a name.");
  expect(input.getRootNode()).toBe(document);
});

it("removes empty optional context references", async () => {
  const field = createField();
  field.id = "field";
  document.body.append(field);
  await field.updateComplete;
  const group = field.querySelector<HTMLElement>("[role=group]");
  expect(group?.hasAttribute("aria-labelledby")).toBe(false);
  expect(group?.hasAttribute("aria-describedby")).toBe(false);
});

function createField(): UnifoldField {
  defineUnifoldField(customElements);
  return document.createElement(CoreElementTag.Field) as UnifoldField;
}
