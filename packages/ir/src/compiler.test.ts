import {
  JsonUiUpstreamRevision,
  UiControlNodeKind,
  UiControlTopologyVersion
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  CompilationStatus,
  CoreComponentType,
  DiagnosticCode,
  UiNodeKind,
  compileUiDocument,
  type CompileResult,
  type UnifoldIrDocument
} from "./index.js";
import {
  compilerDocument as createDocument,
  compilerSemanticGraph as semanticGraph
} from "./compiler.test-data.js";

it("normalizes the supported JsonUI profile with stable source mappings", () => {
  const document = requireCompiledDocument(compileUiDocument(createDocument()));

  expect(document.renderOrder).toEqual(["customer-form", "email", "save"]);
  expect(document.nodesById["email"]).toMatchObject({
    kind: UiNodeKind.Control,
    parentId: "customer-form",
    properties: { label: "Email", required: true },
    scopePath: ["customer-form", "email"]
  });
  expect(document.sourcePointersByNodeId["save"]).toBe("/view/$children/1");
  expect(document.source.jsonUiUpstreamRevision).toBe(JsonUiUpstreamRevision.Version01025);
});

it("compiles explicit control ownership independently from visual nesting", () => {
  const source = createDocument();
  const result = compileUiDocument({
    ...source,
    controls: {
      contractVersion: UiControlTopologyVersion.Version1,
      nodes: [
        { id: "customer-form", kind: UiControlNodeKind.Form },
        {
          id: "email",
          key: "emailAddress",
          kind: UiControlNodeKind.Control,
          parentId: "customer-form"
        }
      ]
    }
  });
  const document = requireCompiledDocument(result);
  expect(document.nodesById["customer-form"]?.controlChildIds).toEqual(["email"]);
  expect(document.nodesById["email"]).toMatchObject({
    controlKey: "emailAddress",
    controlParentId: "customer-form"
  });
});

it("preserves a validated canonical SemanticGraph in IR", () => {
  const input = createDocument();
  const document = requireCompiledDocument(
    compileUiDocument({ ...input, semantics: semanticGraph() })
  );

  expect(document.semantics).toEqual(semanticGraph());
  expect(semanticPropertyNames(document.semantics)).toEqual(["description", "name"]);
});

function semanticPropertyNames(graph: ReturnType<typeof semanticGraph> | undefined): string[] {
  if (graph === undefined) return [];
  const entity = graph.entities[0];
  return entity === undefined ? [] : Object.keys(entity.properties);
}

it("rejects malformed semantics through normal compiler diagnostics", () => {
  const result = compileUiDocument({
    ...createDocument(),
    semantics: { contractVersion: "1.0.0" }
  });

  expect(result.document).toBeUndefined();
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code: DiagnosticCode.InvalidSemanticGraph,
      path: "/semantics/vocabulary"
    })
  );
});

it("rejects unsupported upstream JsonUI behavior before IR generation", () => {
  const input = createDocument();
  const result = compileUiDocument({
    ...input,
    view: { $comp: "Button", id: "save", label: "Save", onClick: { $action: "set" } }
  });

  expect(result.document).toBeUndefined();
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code: DiagnosticCode.UnsupportedJsonUiFeature,
      path: "/view/onClick/$action"
    })
  );
});

it("rejects an unpinned upstream revision", () => {
  const input = createDocument();
  const result = compileUiDocument({
    ...input,
    jsonUiProfile: { ...input.jsonUiProfile, upstream: "main" }
  });

  expect(result.document).toBeUndefined();
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code: DiagnosticCode.InvalidProfile,
      path: "/jsonUiProfile/upstream"
    })
  );
});

it("rejects an unpinned component catalog before IR generation", () => {
  const input = createDocument();
  const result = compileUiDocument({ ...input, catalog: { name: "other", version: "99.0.0" } });

  expect(result.document).toBeUndefined();
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: DiagnosticCode.InvalidCatalog, path: "/catalog/name" }),
      expect.objectContaining({ code: DiagnosticCode.InvalidCatalog, path: "/catalog/version" })
    ])
  );
});

it("compiles reusable composition boundaries as composition nodes", () => {
  const input = createDocument();
  const result = compileUiDocument({
    ...input,
    view: { $comp: "Composition", id: "profile-editor", label: "Profile editor" }
  });
  const document = requireCompiledDocument(result);

  expect(document.nodesById["profile-editor"]).toMatchObject({
    componentType: CoreComponentType.Composition,
    kind: UiNodeKind.Composition,
    properties: { label: "Profile editor" }
  });
});

it("compiles semantic content primitives without control state", () => {
  const input = createDocument();
  const result = compileUiDocument({
    ...input,
    view: { $comp: "Heading", content: "Customer", id: "title", level: "1" }
  });
  const document = requireCompiledDocument(result);

  expect(document.nodesById["title"]).toMatchObject({
    componentType: CoreComponentType.Heading,
    kind: UiNodeKind.Component,
    properties: { content: "Customer", level: "1" }
  });
});

it("compiles a strict MasterDetail record selection as one control node", () => {
  const input = createDocument();
  const result = compileUiDocument({
    ...input,
    view: {
      $comp: "MasterDetail",
      columns: [
        { key: "name", label: "Name" },
        { key: "status", label: "Status" }
      ],
      id: "accounts",
      label: "Accounts",
      masterColumn: "name",
      rows: [{ cells: { name: "Ada", status: "Active" }, id: "ada" }],
      value: "ada"
    }
  });
  const document = requireCompiledDocument(result);

  expect(document.nodesById["accounts"]).toMatchObject({
    componentType: CoreComponentType.MasterDetail,
    kind: UiNodeKind.Control,
    properties: { masterColumn: "name", value: "ada" }
  });
});

it("compiles controlled SearchResults query and selection state as one control node", () => {
  const input = createDocument();
  const result = compileUiDocument({
    ...input,
    view: {
      $comp: "SearchResults",
      id: "customer-search",
      label: "Search customers",
      results: [{ description: "Active", href: "/ada", id: "ada", title: "Ada" }],
      value: { query: "Ada", selectedResultId: "ada" }
    }
  });
  const document = requireCompiledDocument(result);

  expect(document.nodesById["customer-search"]).toMatchObject({
    componentType: CoreComponentType.SearchResults,
    kind: UiNodeKind.Control,
    properties: { value: { query: "Ada", selectedResultId: "ada" } }
  });
});

it("compiles a controlled Wizard and preserves its ordered panel identities", () => {
  const input = createDocument();
  const result = compileUiDocument({
    ...input,
    view: {
      $comp: "Wizard",
      $children: [
        { $comp: "Text", content: "Account", id: "account-panel" },
        { $comp: "Text", content: "Review", id: "review-panel" }
      ],
      id: "account-wizard",
      label: "Create account",
      steps: [
        { id: "account", label: "Account" },
        { id: "review", label: "Review" }
      ],
      value: "account"
    }
  });
  const document = requireCompiledDocument(result);

  expect(document.nodesById["account-wizard"]).toMatchObject({
    childIds: ["account-panel", "review-panel"],
    componentType: CoreComponentType.Wizard,
    kind: UiNodeKind.Control,
    properties: { value: "account" }
  });
});

it("produces identical IR for differently ordered property keys", () => {
  const first = createDocument();
  const second = createDocument();
  const reversed = {
    ...second,
    view: {
      label: "Customer",
      id: "customer-form",
      $comp: "Form",
      $children: second.view.$children
    }
  };

  expect(JSON.stringify(compileUiDocument(first).document)).toBe(
    JSON.stringify(compileUiDocument(reversed).document)
  );
});

it("rejects duplicate node identities before producing IR", () => {
  const input = createDocument();
  const duplicate = {
    ...input,
    view: {
      ...input.view,
      $children: [
        { $comp: "Button", id: "same" },
        { $comp: "Button", id: "same" }
      ]
    }
  };
  const result = compileUiDocument(duplicate);

  expect(result.status).toBe(CompilationStatus.Invalid);
  expect(result.document).toBeUndefined();
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({ code: DiagnosticCode.DuplicateNodeId, nodeId: "same" })
  );
});

it("rejects unsupported components with an actionable source path", () => {
  const input = { ...createDocument(), view: { $comp: "UnknownWidget", id: "widget" } };
  const result = compileUiDocument(input);

  expect(result.status).toBe(CompilationStatus.Invalid);
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code: DiagnosticCode.UnsupportedComponent,
      nodeId: "widget",
      path: "/view/$comp"
    })
  );
});

it("rejects non-JSON values and cyclic input", () => {
  const invalid = { ...createDocument(), extension: Number.NaN };
  const cyclic: Record<string, unknown> = { ...createDocument() };
  cyclic["self"] = cyclic;

  expect(compileUiDocument(invalid).diagnostics[0]?.code).toBe(DiagnosticCode.InvalidJson);
  expect(compileUiDocument(cyclic).diagnostics[0]?.code).toBe(DiagnosticCode.InvalidJson);
});

function requireCompiledDocument(result: CompileResult): UnifoldIrDocument {
  if (result.status !== CompilationStatus.Valid || result.document === undefined) {
    throw new Error("Expected compilation to produce a valid document.");
  }
  return result.document;
}
