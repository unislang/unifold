import { expect, it } from "vitest";

import { JSONUI_COMPATIBILITY_CORPUS } from "./corpus.js";
import { JsonUiCompatibilityExpectation, JsonUiFeature, JsonUiFixtureLicense } from "./enums.js";

it("contains both positive and explicit unsupported cases", () => {
  const expectations = new Set(JSONUI_COMPATIBILITY_CORPUS.map(({ expectation }) => expectation));
  expect(expectations).toEqual(
    new Set([
      JsonUiCompatibilityExpectation.Compatible,
      JsonUiCompatibilityExpectation.Incompatible
    ])
  );
});

it("uses unique stable case identifiers", () => {
  const ids = JSONUI_COMPATIBILITY_CORPUS.map(({ id }) => id);
  expect(new Set(ids).size).toBe(ids.length);
});

it("covers every declared profile feature", () => {
  const covered = new Set(JSONUI_COMPATIBILITY_CORPUS.map(({ feature }) => feature));
  expect(covered).toEqual(new Set(Object.values(JsonUiFeature)));
});

it("attaches upstream provenance and exact diagnostic expectations", () => {
  for (const item of JSONUI_COMPATIBILITY_CORPUS) {
    expect(item.provenance.source).toContain("@jsonui/react");
    expect(item.provenance.license).toBe(JsonUiFixtureLicense.Mit);
    expect(item.provenance.revision).toMatch(/^[a-f\d]{40}$/u);
    expect(item.provenance.transformation).not.toBe("");
    if (item.expectation === JsonUiCompatibilityExpectation.Compatible) {
      expect(item.expectedDiagnostics).toEqual([]);
    } else {
      expect(item.expectedDiagnostics.length).toBeGreaterThan(0);
    }
  }
});

it("exposes a deeply immutable public corpus", () => {
  const item = JSONUI_COMPATIBILITY_CORPUS[0];
  expect(Object.isFrozen(JSONUI_COMPATIBILITY_CORPUS)).toBe(true);
  expect(Object.isFrozen(item)).toBe(true);
  expect(Object.isFrozen(item?.view)).toBe(true);
  expect(Object.isFrozen(item?.expectedDiagnostics)).toBe(true);
});
