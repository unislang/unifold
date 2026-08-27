import { expect, it } from "vitest";

import applicationModule from "./modules/application.module.json" with { type: "json" };
import { resolveHierarchicalModuleArtifact } from "./module-reference.js";

type HierarchicalArtifact = Awaited<ReturnType<typeof resolveHierarchicalModuleArtifact>>;

it("resolves the Scratch-style source through an exact versioned module", async () => {
  const first = await resolveHierarchicalModuleArtifact();
  const second = await resolveHierarchicalModuleArtifact();
  expectAuthoredSource();
  expectResolvedDocument(first);
  expectResolvedGraph(first);
  expect(second).toEqual(first);
});

function expectAuthoredSource(): void {
  expect(applicationModule.exports.documents[0]?.document).toMatchObject({
    layoutType: "layouts/layout/contact-workflow",
    variables: { heading: "Tell us about yourself" }
  });
}

function expectResolvedDocument(artifact: HierarchicalArtifact): void {
  const view = artifact.composedDocument["view"];
  expect(view).toMatchObject({ $comp: "Stack", id: "contact-page" });
  expect(artifact.document["view"]).toEqual(view);
  expect(artifact.document["compositionManifest"]).toMatchObject({
    contractVersion: "1.0.0",
    instances: []
  });
  expect(artifact.integrity).toMatch(/^sha256-/u);
  expect(artifact.resources["layouts/layout/contact-workflow"]).toBeDefined();
}

function expectResolvedGraph(artifact: HierarchicalArtifact): void {
  expect(artifact.graph).toEqual([
    expect.objectContaining({
      moduleId: "org.unifold.examples.hierarchical-layouts",
      namespace: "layouts",
      sourceId: "src/modules/layouts.module.json",
      version: "1.0.0"
    }),
    expect.objectContaining({
      moduleId: "org.unifold.examples.hierarchical-application",
      namespace: "",
      sourceId: "src/modules/application.module.json",
      version: "1.0.0"
    })
  ]);
  expect(artifact.sourceMap["/view"]).toMatchObject({
    moduleId: "org.unifold.examples.hierarchical-layouts",
    pointer: "/exports/resources/0/value/template",
    sourceId: "src/modules/layouts.module.json"
  });
}
