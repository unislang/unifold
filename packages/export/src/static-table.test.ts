import { DataClassification } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import {
  completeStaticDocument,
  prepareTestDocument,
  semanticDocument
} from "./static-html.test-data.js";
import { renderStaticTree } from "./static-renderer.js";

it("renders escaped native table content with row headers", () => {
  const html = renderStaticTree(prepareTestDocument(completeStaticDocument()).document);
  expect(html).toContain('data-unifold-static-component="Table"');
  expect(html).toContain("<caption>People</caption>");
  expect(html).toContain('<th scope="col">Name</th>');
  expect(html).toContain('<th scope="row">Ada</th>');
  expect(html).toContain("&lt;strong&gt;Grace&lt;/strong&gt;");
  expect(html).not.toContain("<strong>Grace</strong>");
});

it("omits all classified table metadata and cells", () => {
  const source = prepareTestDocument(completeStaticDocument()).document;
  const stores = prepareTestDocument(semanticDocument(DataClassification.Restricted)).document
    .storesById;
  const restricted = bindTable(source, stores);
  const markup = tableMarkup(renderStaticTree(restricted));
  expect(markup).toContain("<caption></caption>");
  expect(markup).not.toContain("People");
  expect(markup).not.toContain("Ada");
});

function bindTable(
  document: UnifoldIrDocument,
  storesById: UnifoldIrDocument["storesById"]
): UnifoldIrDocument {
  const node = document.nodesById["people"];
  if (node === undefined) throw new Error("Expected people table.");
  return {
    ...document,
    nodesById: {
      ...document.nodesById,
      people: { ...node, binding: { path: "/name", store: "profile" } }
    },
    storesById
  };
}

function tableMarkup(html: string): string {
  const start = html.indexOf('data-unifold-static-node-id="people"');
  return html.slice(start, html.indexOf("</table>", start));
}
