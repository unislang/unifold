import { DataClassification } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { prepareTestDocument } from "./static-html.test-data.js";
import { renderStaticTree } from "./static-renderer.js";
import {
  classifiedSearchResultsDocument,
  largeSearchResultsDocument
} from "./static-search-results.test-data.js";

it("renders bounded escaped public search links plus a distant selection", () => {
  const html = renderStaticTree(prepareTestDocument(largeSearchResultsDocument()).document);

  expect(html.match(/<li/gu)).toHaveLength(201);
  expect(html).toContain("201 of 205 results");
  expect(html).toContain('href="/people/204"');
  expect(html).toContain('aria-current="true"');
  expect(html).toContain("&lt;script&gt;204&lt;/script&gt;");
  expect(html).not.toContain("<script>204</script>");
});

it("emits an empty semantic shell for classified query and result data", () => {
  const document = prepareTestDocument(
    classifiedSearchResultsDocument(DataClassification.Restricted)
  ).document;
  const html = renderStaticTree(document);

  expect(html).not.toContain("Person");
  expect(html).not.toContain("Ada");
  expect(html).not.toContain("Search people");
  expect(html).toContain('<section role="search">');
  expect(html).toContain('<ol aria-label=""></ol>');
});
