import { expect, it } from "vitest";

import { CompilationStatus, DiagnosticCode, compileUiDocument } from "./index.js";
import { composedDocument } from "./composition-validation.test-data.js";

it("accepts one-to-one inactive composition identity aliases", () => {
  const source = composedDocument();
  const result = compileUiDocument({
    ...source,
    compositionManifest: {
      ...source.compositionManifest,
      identityAliases: { "editor::name": "editor:name" }
    }
  });
  expect(result.status).toBe(CompilationStatus.Valid);
  expect(result.document?.nodeIdentityAliases).toEqual({ "editor::name": "editor:name" });
});

it("rejects unknown targets, active sources, reused sources, and malformed aliases", () => {
  const source = composedDocument();
  const invalid = {
    ...source,
    compositionManifest: {
      ...source.compositionManifest,
      identityAliases: {
        editor: "editor::name",
        "editor::name": "legacy",
        missing: "legacy",
        malformed: 4
      }
    }
  };
  const result = compileUiDocument(invalid);
  expect(result.status).toBe(CompilationStatus.Invalid);
  expect(
    result.diagnostics.filter(({ code }) => code === DiagnosticCode.InvalidCompositionManifest)
  ).toHaveLength(5);
});
