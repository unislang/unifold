import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { validateNodeProperties } from "./property-validation.js";
import type { CompilerDiagnostic } from "./types.js";

it("accepts null and finite step-aligned NumberField values", () => {
  expect(validate(numberField({ value: null }))).toEqual([]);
  expect(validate(numberField({ min: 0.1, step: 0.1, value: 0.3 }))).toEqual([]);
});

it("rejects non-finite, non-positive-step, reversed, out-of-range, and off-step values", () => {
  expect(validate(numberField({ value: Number.POSITIVE_INFINITY }))).toContainEqual(
    expect.objectContaining({ code: "invalid-property", path: "/view/value" })
  );
  expect(validate(numberField({ step: 0 }))).toContainEqual(
    expect.objectContaining({ code: "invalid-property", path: "/view/step" })
  );
  expect(validate(numberField({ max: 1, min: 2 }))).toContainEqual(
    expect.objectContaining({ code: "invalid-property", path: "/view/max" })
  );
  expect(validate(numberField({ max: 10, min: 0, value: 11 }))).toContainEqual(
    expect.objectContaining({ code: "invalid-property", path: "/view/value" })
  );
  expect(validate(numberField({ min: 0, step: 2, value: 3 }))).toContainEqual(
    expect.objectContaining({ code: "invalid-property", path: "/view/value" })
  );
});

it("requires a label and rejects authored children", () => {
  const source = numberField({
    $children: [{ $comp: CoreComponentType.Text, content: "Not allowed", id: "child" }],
    value: 1
  });
  Reflect.deleteProperty(source, "label");
  expect(validate(source)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "missing-required-property", path: "/view/label" }),
      expect.objectContaining({ code: "invalid-child-count", path: "/view/$children" })
    ])
  );
});

function numberField(properties: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return {
    $comp: CoreComponentType.NumberField,
    id: "age",
    label: "Age",
    step: 1,
    ...properties
  };
}

function validate(node: Readonly<Record<string, unknown>>): readonly CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  validateNodeProperties(node, CoreComponentType.NumberField, "/view", diagnostics);
  return diagnostics;
}
