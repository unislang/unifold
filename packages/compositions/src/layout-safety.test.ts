import { expect, it } from "vitest";

import { CompositionDiagnosticCode } from "./enums.js";
import { validateLayoutJson, validateLayoutJsonAt } from "./layout-safety.js";
import type { CompositionDiagnostic } from "./types.js";

it("accepts bounded plain JSON and rejects executable, cyclic, and non-finite values", () => {
  expect(validate({ nested: [null, true, 3, "safe"] })).toEqual([]);
  expect(firstDiagnostic(validate({ value: () => undefined }))).toMatchObject({
    code: CompositionDiagnosticCode.InvalidLayout,
    path: "/value"
  });
  expect(firstDiagnostic(validate({ value: Number.POSITIVE_INFINITY })).message).toContain(
    "finite"
  );
  expect(firstDiagnostic(validate(new Date())).message).toContain("plain JSON");

  const cyclic: Record<string, unknown> = {};
  cyclic["self"] = cyclic;
  expect(firstDiagnostic(validate(cyclic)).message).toContain("cyclic or shared");
});

it("rejects unsafe keys and excessive nesting with exact JSON pointers", () => {
  const unsafe = JSON.parse('{"nested":{"__proto__":true}}') as unknown;
  expect(firstDiagnostic(validate(unsafe))).toMatchObject({ path: "/nested/__proto__" });

  let deep: Record<string, unknown> = {};
  const root = deep;
  for (let index = 0; index < 65; index += 1) {
    const next: Record<string, unknown> = {};
    deep["next"] = next;
    deep = next;
  }
  expect(firstDiagnostic(validate(root)).message).toContain("depth budget");
});

it("anchors registry violations at its virtual source pointer", () => {
  const diagnostics: CompositionDiagnostic[] = [];
  const path = "/$layoutRegistry/definitions";
  expect(validateLayoutJsonAt([() => undefined], diagnostics, path)).toBe(false);
  expect(firstDiagnostic(diagnostics).path).toBe(`${path}/0`);
});

function validate(value: unknown): CompositionDiagnostic[] {
  const diagnostics: CompositionDiagnostic[] = [];
  validateLayoutJson(value, diagnostics);
  return diagnostics;
}

function firstDiagnostic(diagnostics: CompositionDiagnostic[]): CompositionDiagnostic {
  const diagnostic = diagnostics[0];
  if (diagnostic === undefined) throw new Error("Expected a diagnostic.");
  return diagnostic;
}
