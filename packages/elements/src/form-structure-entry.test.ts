// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import {
  defineUnifoldErrorSummary,
  defineUnifoldField,
  defineUnifoldFieldset,
  UnifoldErrorSummary,
  UnifoldField,
  UnifoldFieldset
} from "./form-structure-entry.js";

it("defines each optional form-structure element idempotently", () => {
  const registrations = [
    [defineUnifoldErrorSummary, CoreElementTag.ErrorSummary, UnifoldErrorSummary],
    [defineUnifoldField, CoreElementTag.Field, UnifoldField],
    [defineUnifoldFieldset, CoreElementTag.Fieldset, UnifoldFieldset]
  ] as const;
  registrations.forEach(([define, tag, constructor]) => {
    expect(define(customElements)).toMatchObject({ definedTags: [tag], status: "registered" });
    expect(define(customElements)).toMatchObject({ definedTags: [], status: "registered" });
    expect(customElements.get(tag)).toBe(constructor);
  });
});

it("rejects the family without a registry", () => {
  expect(defineUnifoldField(null)).toMatchObject({ definedTags: [], status: "rejected" });
  vi.stubGlobal("customElements", undefined);
  expect(defineUnifoldField()).toMatchObject({ definedTags: [], status: "rejected" });
  vi.unstubAllGlobals();
});
