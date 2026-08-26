import {
  UiCompositionSelectionKind,
  type UiCompositionInstanceManifest,
  type UiCompositionManifest,
  type UiDocument
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CompilationStatus, DiagnosticCode, compileUiDocument } from "./index.js";
import { composedDocument } from "./composition-validation.test-data.js";

it("preserves validated composition manifests in normalized IR", () => {
  const result = compileUiDocument(composedDocument());
  const document = requireCompiledDocument(result.document);
  expect(result.status).toBe(CompilationStatus.Valid);
  expect(document.compositionsByInstanceId["editor"]?.exports["name"]).toMatchObject({
    nodeId: "editor::name",
    selection: UiCompositionSelectionKind.ControlValue
  });
  expect(document.nodesById["editor::name"]?.composition).toMatchObject({
    definitionSourcePointer: "/compositions/0/template/$children/0",
    instanceId: "editor",
    localId: "name"
  });
});

it("rejects missing targets and control selections on non-controls", () => {
  const missing = withExportTarget("missing");
  const nonControl = withExportTarget("editor");
  expect(codes(missing)).toContain(DiagnosticCode.InvalidCompositionExport);
  expect(codes(nonControl)).toContain(DiagnosticCode.InvalidCompositionExport);
});

it("accepts RadioGroup control-value selection exports", () => {
  expect(compileUiDocument(withRadioGroup()).status).toBe(CompilationStatus.Valid);
});

it("rejects malformed manifest identity and export kinds", () => {
  const source = composedDocument();
  const instance = requireInstance(source);
  const invalid = {
    ...source,
    compositionManifest: {
      ...source.compositionManifest,
      contractVersion: "2.0.0",
      instances: [{ ...instance, rootNodeId: "editor::name", ancestry: ["other"] }]
    }
  };
  expect(codes(invalid)).toContain(DiagnosticCode.InvalidCompositionManifest);
});

function withExportTarget(nodeId: string) {
  const source = composedDocument();
  const instance = requireInstance(source);
  const descriptor = instance.exports["name"];
  return {
    ...source,
    compositionManifest: {
      ...source.compositionManifest,
      instances: [
        {
          ...instance,
          exports: { name: { ...descriptor, nodeId } }
        }
      ]
    }
  };
}

function withRadioGroup(): UiDocument {
  const source = composedDocument();
  return {
    ...source,
    view: {
      ...source.view,
      $children: [
        {
          $comp: "RadioGroup",
          id: "editor::name",
          options: [{ label: "Email", value: "email" }],
          value: "email"
        }
      ]
    }
  };
}

function requireInstance(source: UiDocument): UiCompositionInstanceManifest {
  const instance = requireManifest(source).instances[0];
  if (instance === undefined) throw new Error("Expected a composition instance.");
  return instance;
}

function requireManifest(source: UiDocument): UiCompositionManifest {
  if (source.compositionManifest === undefined) throw new Error("Expected a composition manifest.");
  return source.compositionManifest;
}

function requireCompiledDocument<T>(document: T | undefined): T {
  if (document === undefined) throw new Error("Expected a compiled document.");
  return document;
}

function codes(value: unknown): DiagnosticCode[] {
  return compileUiDocument(value).diagnostics.map(({ code }) => code);
}
