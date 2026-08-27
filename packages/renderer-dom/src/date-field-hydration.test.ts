// @vitest-environment happy-dom
import { CoreComponentType, UiNodeKind } from "@unislang/unifold-contracts";
import type { UnifoldIrNode } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { readStaticDateFieldValue } from "./date-field-hydration.js";

it("reads an edited canonical date-only value", () => {
  expect(readStaticDateFieldValue(dateNode(), dateInput(), invalid)).toBe("2026-09-03");
});

it.each([
  ["wrong type", { type: "text" }],
  ["wrong autocomplete", { autocomplete: "bday" }],
  ["wrong name", { name: "tampered" }],
  ["wrong minimum", { min: "2024-01-01" }],
  ["wrong maximum", { max: "2028-01-01" }],
  ["wrong step", { step: "2" }],
  ["wrong required state", { required: false }],
  ["out of range", { value: "2028-01-01" }]
])("rejects %s", (_title, change) => {
  const input = dateInput();
  Object.assign(input, change);
  expect(() => readStaticDateFieldValue(dateNode(), input, invalid)).toThrow("invalid date");
});

function dateInput(): HTMLInputElement {
  const input = document.createElement("input");
  Object.assign(input, {
    autocomplete: "off",
    max: "2027-12-31",
    min: "2025-01-01",
    name: "startDate",
    required: true,
    step: "1",
    type: "date",
    value: "2026-09-03"
  });
  return input;
}

function dateNode(): UnifoldIrNode {
  return {
    childIds: [],
    componentType: CoreComponentType.DateField,
    eventBindings: {},
    id: "start-date",
    kind: UiNodeKind.Control,
    properties: {
      autocomplete: "off",
      max: "2027-12-31",
      min: "2025-01-01",
      name: "startDate",
      required: true,
      step: 1
    },
    scopePath: ["start-date"]
  };
}

function invalid(): Error {
  return new Error("invalid date");
}
