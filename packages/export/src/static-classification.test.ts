import { DataClassification } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { prepareTestDocument, semanticDocument } from "./static-html.test-data.js";
import { staticNodeClassification } from "./static-classification.js";

it("classifies static nodes from their declared store binding", () => {
  const document = prepareTestDocument(
    semanticDocument(DataClassification.Restricted, "classified-secret")
  ).document;
  const node = document.nodesById["name"];
  if (node === undefined) throw new Error("Expected the classified node.");
  expect(staticNodeClassification(document, node)).toBe(DataClassification.Restricted);
  expect(
    staticNodeClassification(document, { ...node, binding: { path: "/", store: "missing" } })
  ).toBe(DataClassification.NeverExport);
});
