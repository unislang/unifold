import { expect, it } from "vitest";

import { completeStaticDocument, prepareTestDocument } from "./static-html.test-data.js";
import { renderStaticMenuButton } from "./static-menu.js";

it("renders an escaped native disclosure with disabled action fidelity", () => {
  const document = prepareTestDocument(completeStaticDocument()).document;
  const node = document.nodesById["account-menu"];
  if (node === undefined) throw new Error("MenuButton fixture is missing.");
  const html = renderStaticMenuButton({ node });
  expect(html).toContain("<summary>Account actions</summary>");
  expect(html).toContain('<button type="button" disabled>Delete account</button>');
});
