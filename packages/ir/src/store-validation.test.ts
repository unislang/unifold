import {
  UiStoreAccess,
  UiStoreOwnership,
  UiStorePersistence,
  UiStoreSourceKind
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { compileUiDocument } from "./compiler.js";
import { CompilationStatus, DiagnosticCode } from "./enums.js";
import { boundDocument, customerStore, dataGridValueSchema } from "./store-validation.test-data.js";

it("compiles a declared, schema-compatible store path into immutable IR", () => {
  const result = compileUiDocument(boundDocument());
  expect(result.status).toBe(CompilationStatus.Valid);
  const document = requireDocument(result.document);
  expect(requireNode(document.nodesById["name"]).binding).toEqual({
    path: "/name",
    store: "customer"
  });
  expect(requireStore(document.storesById["customer"]).classification).toBe("internal");
});

it("compiles an object-valued DataGrid store binding", () => {
  const authored = boundDocument();
  const store = customerStore({
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: { grid: dataGridValueSchema() },
      required: ["grid"],
      type: "object"
    }
  });
  const result = compileUiDocument({
    ...authored,
    stores: [store],
    view: {
      $comp: "DataGrid",
      caption: "People",
      columns: [{ key: "name", label: "Name" }],
      id: "grid",
      path: "/grid",
      rows: [{ cells: { name: "Ada" }, id: "ada" }],
      store: "customer"
    }
  });
  expect(result.status).toBe(CompilationStatus.Valid);
  expect(requireNode(requireDocument(result.document).nodesById["grid"]).binding).toEqual({
    path: "/grid",
    store: "customer"
  });
});

it("rejects unknown, missing, incompatible, and non-control bindings", () => {
  expect(codeFor({ store: "missing" })).toBe(DiagnosticCode.UnsupportedJsonUiFeature);
  expect(codeFor({ path: "/missing" })).toBe(DiagnosticCode.InvalidStorePath);
  expect(codeFor({ path: "/subscribed" })).toBe(DiagnosticCode.InvalidStoreBinding);
  expect(codeFor({ $comp: "Text", path: "/name" })).toBe(DiagnosticCode.InvalidStoreBinding);
});

it("rejects duplicate, remote-reference, reversed-migration, and writable-query stores", () => {
  const duplicate = boundDocument();
  expect(
    compileUiDocument({ ...duplicate, stores: [customerStore(), customerStore()] }).diagnostics
  ).toContainEqual(expect.objectContaining({ code: DiagnosticCode.DuplicateStoreId }));

  expect(storeCode(customerStore({ schema: remoteSchema() }))).toBe(
    DiagnosticCode.InvalidStoreDefinition
  );
  expect(storeCode(customerStore({ migrations: { maximum: "1.0.0", minimum: "2.0.0" } }))).toBe(
    DiagnosticCode.InvalidStoreDefinition
  );
  expect(storeCode(writableQuery())).toBe(DiagnosticCode.InvalidStoreDefinition);
});

it("rejects unsafe identifiers, pointers, and undeclared policy fields", () => {
  expect(storeCodes(customerStore({ id: "bad/id" }), "bad/id")).toContain(
    DiagnosticCode.InvalidStoreDefinition
  );
  expect(storeCodes({ ...customerStore(), unexpected: true })).toContain(
    DiagnosticCode.InvalidStoreDefinition
  );
  expect(
    storeCodes({ ...customerStore(), source: { kind: UiStoreSourceKind.Host, token: true } })
  ).toContain(DiagnosticCode.InvalidStoreDefinition);
  expect(
    storeCodes({
      ...customerStore(),
      migrations: { maximum: "2.9.0", minimum: "2.0.0", script: "unsafe" }
    })
  ).toContain(DiagnosticCode.InvalidStoreDefinition);
  expect(codeFor({ path: "/constructor/value" })).toBe(DiagnosticCode.InvalidStorePath);
  expect(codeFor({ path: "/bad~2escape" })).toBe(DiagnosticCode.InvalidStorePath);
  expect(codeFor({ path: `/${"a".repeat(2048)}` })).toBe(DiagnosticCode.InvalidStorePath);
});

function codeFor(changes: Readonly<Record<string, unknown>>): DiagnosticCode | undefined {
  const document = boundDocument();
  return compileUiDocument({ ...document, view: { ...document.view, ...changes } }).diagnostics[0]
    ?.code;
}

function storeCode(store: unknown): DiagnosticCode | undefined {
  return compileUiDocument({ ...boundDocument(), stores: [store] }).diagnostics[0]?.code;
}

function storeCodes(store: unknown, storeId = "customer"): readonly DiagnosticCode[] {
  const document = boundDocument();
  const view = { ...document.view, store: storeId };
  return compileUiDocument({ ...document, stores: [store], view }).diagnostics.map(
    ({ code }) => code
  );
}

function requireDocument<T>(document: T | undefined): T {
  if (document === undefined) throw new Error("Compiled document is missing.");
  return document;
}

function requireNode<T>(node: T | undefined): T {
  if (node === undefined) throw new Error("Compiled node is missing.");
  return node;
}

function requireStore<T>(store: T | undefined): T {
  if (store === undefined) throw new Error("Compiled store is missing.");
  return store;
}

function remoteSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    properties: { name: { $ref: "https://schemas.example.com/name.json" } },
    type: "object"
  };
}

function writableQuery() {
  return customerStore({
    access: UiStoreAccess.ReadWriteDraft,
    ownership: UiStoreOwnership.RemoteQuery,
    persistence: UiStorePersistence.Remote,
    source: { kind: UiStoreSourceKind.Query }
  });
}
