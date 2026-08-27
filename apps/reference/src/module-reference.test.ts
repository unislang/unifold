import { UnifoldPreparationStatus, prepareUnifoldDocument } from "@unislang/unifold";
import {
  createUiModuleLock,
  uiModuleIntegrity,
  validateUiModuleLock
} from "@unislang/unifold-modules";
import { expect, it } from "vitest";

import referenceDocument from "./ui.json" with { type: "json" };
import {
  resolveProductionReferenceArtifact,
  resolveReferenceModuleArtifact
} from "./module-reference.js";

it("resolves the fixed Scratch-style reference modules with runtime and lock parity", async () => {
  const first = await resolveReferenceModuleArtifact();
  const second = await resolveReferenceModuleArtifact();
  expect(first).toEqual(second);
  expectReferenceView(first.composedDocument["view"]);
  expect(first.resources["shared/message/profile-heading"]).toMatchObject({
    value: "Module-authored profile"
  });
  const preparation = prepareUnifoldDocument(first.composedDocument);
  expect(preparation.status).toBe(UnifoldPreparationStatus.Valid);
  const irIntegrity = await uiModuleIntegrity(requirePrepared(preparation).document);
  const lock = createUiModuleLock(first, entry(), irIntegrity);
  expect(validateUiModuleLock(lock)).toMatchObject({ diagnostics: [], lock });
  expect(lock.modules).toHaveLength(2);
  expect(first.sourceMap["/view"]).toMatchObject({
    sourceId: "src/modules/application.module.json"
  });
});

it("compiles the complete production reference document through UiModule", async () => {
  const artifact = await resolveProductionReferenceArtifact();
  expect(artifact.composedDocument).toEqual(referenceDocument);
  expect(artifact.graph).toHaveLength(2);
  expect(artifact.integrity).toMatch(/^sha256-[A-Za-z0-9_-]{43}$/u);
  expect(artifact.sourceMap["/view"]).toMatchObject({ sourceId: "src/ui.json" });
  expect(prepareUnifoldDocument(artifact.composedDocument).status).toBe(
    UnifoldPreparationStatus.Valid
  );
});

function expectReferenceView(view: unknown): void {
  expect(view).toMatchObject({
    $children: [
      { $comp: "Heading", content: "Module-authored profile", id: "module-heading" },
      {
        $children: [
          { $comp: "TextField", events: { input: "NAME_CHANGED" }, id: "module-name" },
          { $comp: "Button", id: "module-submit" }
        ],
        $comp: "Form",
        id: "module-form"
      }
    ],
    $comp: "Stack",
    id: "module-page"
  });
}

function requirePrepared(result: ReturnType<typeof prepareUnifoldDocument>) {
  if (result.prepared === undefined) throw new Error("Expected the reference module to compile.");
  return result.prepared;
}

function entry() {
  return {
    exportName: "application",
    moduleId: "org.unifold.reference.application",
    version: "1.0.0"
  };
}
