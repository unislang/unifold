import { expect, it } from "vitest";

import { DiagnosticCode, compileUiDocument } from "./index.js";
import { composedDocument } from "./composition-validation.test-data.js";

it("rejects unknown provenance nodes and missing root provenance", () => {
  const source = composedDocument();
  const provenance = source.compositionManifest?.nodeProvenanceById ?? {};
  const withoutRoot = { ...provenance };
  delete withoutRoot["editor"];
  const invalid = withProvenance({ ...withoutRoot, missing: provenance["editor::name"] });
  expect(codes(invalid)).toContain(DiagnosticCode.InvalidCompositionProvenance);
});

it("rejects ownership and ancestry mismatches", () => {
  const source = composedDocument();
  const provenance = source.compositionManifest?.nodeProvenanceById ?? {};
  const field = provenance["editor::name"];
  const invalid = withProvenance({
    ...provenance,
    "editor::name": { ...field, ancestry: ["other"], instanceId: "missing" }
  });
  expect(codes(invalid)).toContain(DiagnosticCode.InvalidCompositionProvenance);
});

function withProvenance(nodeProvenanceById: Readonly<Record<string, unknown>>) {
  const source = composedDocument();
  return {
    ...source,
    compositionManifest: { ...source.compositionManifest, nodeProvenanceById }
  };
}

function codes(value: unknown): DiagnosticCode[] {
  return compileUiDocument(value).diagnostics.map(({ code }) => code);
}
