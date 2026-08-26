// @vitest-environment happy-dom
import { CoreComponentType, UiNodeKind } from "@unislang/unifold-contracts";
import type { UnifoldIrNode } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { readStaticSearchFieldValue } from "./search-field-hydration.js";

it("requires one native search input and enforces its declared query bound", () => {
  const input = document.createElement("input");
  input.type = "search";
  input.value = "query";
  expect(readStaticSearchFieldValue(node(5), input, invalid)).toBe("query");
  input.value = "longer";
  expect(() => readStaticSearchFieldValue(node(5), input, invalid)).toThrow("invalid search");
  input.type = "text";
  expect(() => readStaticSearchFieldValue(node(10), input, invalid)).toThrow("invalid search");
});

function node(maxLength: number): UnifoldIrNode {
  return {
    childIds: [],
    componentType: CoreComponentType.SearchField,
    eventBindings: {},
    id: "query",
    kind: UiNodeKind.Control,
    properties: { maxLength },
    scopePath: ["query"]
  };
}

function invalid(): Error {
  return new Error("invalid search");
}
