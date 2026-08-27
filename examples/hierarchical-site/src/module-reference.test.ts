import { expect, it } from "vitest";

import sourceDocument from "./ui.json" with { type: "json" };
import { resolveHierarchicalModuleArtifact } from "./module-reference.js";

it("resolves the Scratch-style source through an exact versioned module", async () => {
  const first = await resolveHierarchicalModuleArtifact();
  const second = await resolveHierarchicalModuleArtifact();

  expect(sourceDocument).toMatchObject({
    layoutType: "contact-workflow",
    variables: { heading: "Tell us about yourself" }
  });
  expect(first.composedDocument["view"]).toMatchObject({
    $comp: "Stack",
    id: "contact-page"
  });
  expect(first.document["view"]).toEqual(first.composedDocument["view"]);
  expect(first.document["compositionManifest"]).toMatchObject({
    contractVersion: "1.0.0",
    instances: []
  });
  expect(first.integrity).toMatch(/^sha256-/u);
  expect(second).toEqual(first);
  expect(first.graph).toEqual([
    expect.objectContaining({
      moduleId: "org.unifold.examples.hierarchical-contact",
      namespace: "",
      sourceId: "src/ui.json",
      version: "1.0.0"
    })
  ]);
  expect(first.sourceMap["/view"]?.pointer).toBe("/exports/documents/0/document/view");
});
