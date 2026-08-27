import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { validateNodeProperties } from "./property-validation.js";
import type { CompilerDiagnostic } from "./types.js";

it("accepts empty and bounded step-aligned canonical dates", () => {
  expect(validate(dateField({ value: "" }))).toEqual([]);
  expect(validate(dateField({ min: "2026-01-01", step: 2, value: "2026-01-03" }))).toEqual([]);
  expect(validate(dateField({ value: "2024-02-29" }))).toEqual([]);
});

it("rejects impossible, reversed, out-of-range, and off-step dates", () => {
  expect(validate(dateField({ value: "2025-02-29" }))).toContainEqual(
    expect.objectContaining({ code: "invalid-property", path: "/view/value" })
  );
  expect(validate(dateField({ max: "2026-01-01", min: "2026-01-02" }))).toContainEqual(
    expect.objectContaining({ code: "invalid-property", path: "/view/max" })
  );
  expect(validate(dateField({ max: "2026-01-31", value: "2026-02-01" }))).toContainEqual(
    expect.objectContaining({ code: "invalid-property", path: "/view/value" })
  );
  expect(validate(dateField({ min: "2026-01-01", step: 2, value: "2026-01-02" }))).toContainEqual(
    expect.objectContaining({ code: "invalid-property", path: "/view/value" })
  );
});

it("rejects empty labels, non-positive steps, and authored children", () => {
  const source = dateField({
    $children: [{ $comp: CoreComponentType.Text, content: "Not allowed", id: "child" }],
    label: "",
    step: 0
  });
  expect(validate(source)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "invalid-property", path: "/view/label" }),
      expect.objectContaining({ code: "invalid-property", path: "/view/step" }),
      expect.objectContaining({ code: "invalid-child-count", path: "/view/$children" })
    ])
  );
});

it("requires an explicit minimum date to anchor day steps greater than one", () => {
  expect(validate(dateField({ step: 2, value: "" }))).toContainEqual(
    expect.objectContaining({ code: "invalid-property", path: "/view/min" })
  );
});

function dateField(properties: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return {
    $comp: CoreComponentType.DateField,
    id: "start-date",
    label: "Start date",
    ...properties
  };
}

function validate(node: Readonly<Record<string, unknown>>): readonly CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  validateNodeProperties(node, CoreComponentType.DateField, "/view", diagnostics);
  return diagnostics;
}
