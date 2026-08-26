import { expect, it } from "vitest";

import { completeStaticDocument, prepareTestDocument } from "./static-html.test-data.js";
import {
  isErrorSummaryTarget,
  renderStaticErrorSummary,
  renderStaticField,
  renderStaticFieldset,
  renderStaticForm
} from "./static-form-structure.js";

it("renders linked errors and accessible form structure from compiled nodes", () => {
  const document = prepareTestDocument(completeStaticDocument()).document;
  expect(renderStaticErrorSummary(context(document, "form-errors"))).toContain(
    '<a href="#name">Enter your name</a>'
  );
  expect(renderStaticField(context(document, "nickname-field", "<input>"))).toContain(
    'role="group" aria-labelledby="nickname-field__field-label"'
  );
  expect(renderStaticFieldset(context(document, "communication-group", "<input>"))).toContain(
    "<legend>Communication</legend>"
  );
  expect(renderStaticForm(context(document, "form", "<input>"))).toContain(
    "Correct the highlighted field"
  );
  expect(isErrorSummaryTarget(document, "name")).toBe(true);
});

function context(
  document: ReturnType<typeof prepareTestDocument>["document"],
  id: string,
  children = ""
) {
  const node = document.nodesById[id];
  if (node === undefined) throw new Error(`Static form fixture is missing: ${id}.`);
  return { children, node };
}
