import { expect, it } from "vitest";
import { DataClassification } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";

import {
  classifiedVirtualListDocument,
  completeStaticDocument,
  largeVirtualListDocument,
  prepareTestDocument
} from "./static-html.test-data.js";
import { renderStaticTree } from "./static-renderer.js";

it("renders meaningful bounded no-JavaScript listbox content", () => {
  const html = renderStaticTree(prepareTestDocument(completeStaticDocument()).document);

  expect(html).toContain('data-unifold-static-component="VirtualList"');
  expect(html).toContain('role="listbox"');
  expect(html).toContain('aria-selected="true"');
  expect(html).toContain("Email");
});

it("includes a distant selected option in its bounded static window", () => {
  const html = renderStaticTree(prepareTestDocument(largeVirtualListDocument()).document);

  expect(html.match(/role="option"/gu)).toHaveLength(201);
  expect(html).toContain("201 of 205 items");
  expect(html).toContain('aria-posinset="205"');
  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain(">Item 205</div>");
});

it("omits options and selection for restricted or unresolved store bindings", () => {
  const restricted = prepareTestDocument(
    classifiedVirtualListDocument(DataClassification.Restricted)
  ).document;
  expect(renderStaticTree(restricted)).not.toContain('role="option"');

  const unresolved = withMissingBinding(restricted);
  expect(renderStaticTree(unresolved)).not.toContain('role="option"');
});

function withMissingBinding(document: UnifoldIrDocument): UnifoldIrDocument {
  const node = document.nodesById["records"];
  if (node === undefined) throw new Error("Expected records node.");
  return {
    ...document,
    nodesById: {
      ...document.nodesById,
      records: { ...node, binding: { path: "/", store: "missing" } }
    }
  };
}
