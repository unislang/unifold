// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it, vi } from "vitest";

import {
  defineUnifoldCard,
  defineUnifoldImage,
  UnifoldCard,
  UnifoldImage
} from "./content-media-entry.js";

it("defines the optional content/media family idempotently", () => {
  const registrations = [
    [defineUnifoldCard, CoreElementTag.Card, UnifoldCard],
    [defineUnifoldImage, CoreElementTag.Image, UnifoldImage]
  ] as const;
  registrations.forEach(([define, tag, constructor]) => {
    expect(define(customElements)).toMatchObject({ definedTags: [tag], status: "registered" });
    expect(define(customElements)).toMatchObject({ definedTags: [], status: "registered" });
    expect(customElements.get(tag)).toBe(constructor);
  });
});

it("rejects registration without an element registry", () => {
  expect(defineUnifoldCard(null)).toMatchObject({ definedTags: [], status: "rejected" });
  vi.stubGlobal("customElements", undefined);
  expect(defineUnifoldImage()).toMatchObject({ definedTags: [], status: "rejected" });
  vi.unstubAllGlobals();
});
