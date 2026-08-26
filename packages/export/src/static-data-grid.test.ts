import { DataClassification } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { prepareTestDocument, semanticDocument } from "./static-html.test-data.js";
import { dataGridStaticDocument } from "./static-data-grid.test-data.js";
import { renderStaticTree } from "./static-renderer.js";

it("renders escaped, sorted, selected native DataGrid state", () => {
  const html = renderStaticTree(prepareTestDocument(dataGridStaticDocument()).document);
  expect(html).toContain('data-unifold-static-component="DataGrid"');
  expect(html).toContain("<caption>People &lt;script&gt;</caption>");
  expect(html).toContain('<th scope="col" aria-sort="ascending">Name</th>');
  expect(html).toContain('aria-label="Select Ada" type="checkbox" checked disabled');
  expect(html.indexOf('data-row-id="ada"')).toBeLessThan(html.indexOf('data-row-id="grace"'));
  expect(html).toContain("Grace &lt;strong&gt;unsafe&lt;/strong&gt;");
  expect(html).toContain('<span role="alert">Review &lt;unsafe&gt;</span>');
  expect(html).not.toContain("<strong>unsafe</strong>");
});

it("exports an empty shell for classified DataGrid content", () => {
  const source = prepareTestDocument(dataGridStaticDocument()).document;
  const stores = prepareTestDocument(semanticDocument(DataClassification.Restricted)).document
    .storesById;
  const restricted = bindGrid(source, stores);
  const markup = renderStaticTree(restricted);
  expect(markup).toContain("<caption></caption>");
  expect(markup).not.toContain("People");
  expect(markup).not.toContain("Ada");
  expect(markup).not.toContain("Review");
});

function bindGrid(
  document: UnifoldIrDocument,
  storesById: UnifoldIrDocument["storesById"]
): UnifoldIrDocument {
  const node = document.nodesById["people-grid"];
  if (node === undefined) throw new Error("Expected DataGrid.");
  return {
    ...document,
    nodesById: {
      ...document.nodesById,
      "people-grid": { ...node, binding: { path: "/name", store: "profile" } }
    },
    storesById
  };
}
