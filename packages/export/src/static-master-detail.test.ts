import { DataClassification } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  classifiedMasterDetailDocument,
  largeMasterDetailDocument
} from "./static-master-detail.test-data.js";
import { prepareTestDocument } from "./static-html.test-data.js";
import { renderStaticTree } from "./static-renderer.js";

it("renders a bounded public master list and the selected no-JavaScript detail", () => {
  const html = renderStaticTree(prepareTestDocument(largeMasterDetailDocument()).document);

  expect(html.match(/role="option"/gu)).toHaveLength(201);
  expect(html).toContain("201 of 205 records");
  expect(html).toContain('aria-posinset="205"');
  expect(html).toContain('aria-selected="true"');
  expect(html).toContain("&lt;script&gt;204&lt;/script&gt;");
  expect(html).not.toContain("<script>204</script>");
});

it("omits master records and detail fields for non-public bindings", () => {
  const document = prepareTestDocument(
    classifiedMasterDetailDocument(DataClassification.Restricted)
  ).document;
  const html = renderStaticTree(document);

  expect(html).not.toContain('role="option"');
  expect(html).not.toContain("Active");
  expect(html).not.toContain("Accounts");
  expect(html).toContain('role="listbox" aria-label=""');
});
