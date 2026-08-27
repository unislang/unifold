import { expect, it } from "vitest";

import { createUiDocumentModule } from "./document-module.js";
import { validateUiModule } from "./schema.js";
import { UiModuleSchemaUri, UiModuleSchemaVersion } from "./types.js";

it("wraps a Scratch-style JSON document in an isolated valid UiModule", () => {
  const document = scratchDocument();
  const module = createUiDocumentModule({
    document,
    exportName: "application",
    moduleId: "org.example.application",
    version: "1.0.0"
  });
  document.variables.heading = "Changed after wrapping";

  expect(module).toMatchObject({
    $schema: UiModuleSchemaUri.Version1,
    id: "org.example.application",
    schemaVersion: UiModuleSchemaVersion.Version1,
    version: "1.0.0"
  });
  expect(module.exports.documents[0]?.document["variables"]).toEqual({ heading: "Welcome" });
  expect(validateUiModule(module).diagnostics).toEqual([]);
});

function scratchDocument() {
  return {
    layoutType: "standard-page",
    variables: { heading: "Welcome" }
  };
}
