// @vitest-environment happy-dom
import { CoreComponentType, UiNodeKind } from "@unislang/unifold-contracts";
import type { UnifoldIrNode } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { readStaticCheckboxGroupValue } from "./checkbox-group-hydration.js";

it("requires one ordered native checkbox per option and captures checked values", () => {
  const controls = [input("news", true), input("security", false, true)];
  expect(readStaticCheckboxGroupValue(node(), controls, invalid)).toEqual(["news"]);
  requiredControl(controls, 1).value = "tampered";
  expect(() => readStaticCheckboxGroupValue(node(), controls, invalid)).toThrow("invalid group");
  expect(() => readStaticCheckboxGroupValue(node(), [...controls].reverse(), invalid)).toThrow();
  expect(() => readStaticCheckboxGroupValue(node(), controls.slice(0, 1), invalid)).toThrow(
    "invalid group"
  );
});

it("rejects name, disabled-state, and checked-disabled drift", () => {
  const wrongName = [input("news", true, false, "other"), input("security", false, true)];
  expect(() => readStaticCheckboxGroupValue(node(), wrongName, invalid)).toThrow("invalid group");
  const enabledDisabledOption = [input("news", true), input("security", false)];
  expect(() => readStaticCheckboxGroupValue(node(), enabledDisabledOption, invalid)).toThrow();
  const checkedDisabled = [input("news", true), input("security", true, true)];
  expect(() => readStaticCheckboxGroupValue(node(), checkedDisabled, invalid)).toThrow();
});

function node(): UnifoldIrNode {
  return {
    childIds: [],
    componentType: CoreComponentType.CheckboxGroup,
    eventBindings: {},
    id: "topics",
    kind: UiNodeKind.Control,
    properties: {
      name: "topics",
      options: [
        { label: "News", value: "news" },
        { disabled: true, label: "Security", value: "security" }
      ]
    },
    scopePath: ["topics"]
  };
}

function input(
  value: string,
  checked: boolean,
  disabled = false,
  name = "topics"
): HTMLInputElement {
  const element = document.createElement("input");
  element.type = "checkbox";
  element.value = value;
  element.checked = checked;
  element.disabled = disabled;
  element.name = name;
  return element;
}

function invalid(): Error {
  return new Error("invalid group");
}

function requiredControl(controls: readonly HTMLInputElement[], index: number): HTMLInputElement {
  const control = controls[index];
  if (control === undefined) throw new Error(`Control ${index} is missing.`);
  return control;
}
