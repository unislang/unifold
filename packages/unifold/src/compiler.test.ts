import { expect, it } from "vitest";

import {
  createTrustedLayoutDefinitionRegistry,
  prepareUnifoldDocument,
  UnifoldDocumentCompiler,
  UnifoldPreparationStatus
} from "./index.js";
import { authoredDocument } from "./application.test-data.js";
import { layoutDocument } from "./compiler-layout.test-data.js";
import type { UnifoldPreparationResult } from "./types.js";

it("expands and compiles an authored document through one public boundary", () => {
  const result = prepareUnifoldDocument(authoredDocument());
  expect(result.status).toBe(UnifoldPreparationStatus.Valid);
  expect(result.prepared?.document.renderOrder).toEqual(["form", "name"]);
});

it("lowers a Scratch-style hierarchical layout before IR compilation", () => {
  const result = prepareUnifoldDocument(layoutDocument());
  expect(result.status).toBe(UnifoldPreparationStatus.Valid);
  const prepared = requirePrepared(result);
  expect(prepared.document.renderOrder).toEqual(["page", "name", "save"]);
  expect(prepared.document.nodesById["save"]?.eventBindings).toEqual({
    activated: "FORM_SUBMIT"
  });
  expect(prepared.document.sourcePointersByNodeId).toEqual({
    name: "/variables/fields/0",
    page: "/layouts/0/template",
    save: "/variables/fields/1"
  });
  expect(prepared.authored).toEqual(layoutDocument());
});

it("reports staged diagnostics without a partial prepared document", () => {
  const result = prepareUnifoldDocument({ compositions: [], view: {} });
  expect(result.status).toBe(UnifoldPreparationStatus.Invalid);
  expect(result.prepared).toBeUndefined();
  expect(result.diagnostics[0]?.stage).toBeDefined();
});

it("reports layout compilation failures at the authored source pointer", () => {
  const source = layoutDocument();
  const field = source.variables.fields[0];
  if (field === undefined) throw new Error("Missing layout field fixture.");
  field.type = "MissingComponent";
  const result = prepareUnifoldDocument(source);
  expect(result.status).toBe(UnifoldPreparationStatus.Invalid);
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([expect.objectContaining({ path: "/variables/fields/0/type" })])
  );
});

it("prepares an exact host-trusted registry definition with virtual provenance", () => {
  const source = layoutDocument();
  const registry = createTrustedLayoutDefinitionRegistry(source.layouts);
  Reflect.deleteProperty(source, "layouts");
  const result = prepareUnifoldDocument(source, { layoutRegistry: registry });
  expect(result.status).toBe(UnifoldPreparationStatus.Valid);
  expect(requirePrepared(result).document.sourcePointersByNodeId).toEqual({
    name: "/variables/fields/0",
    page: "/$layoutRegistry/definitions/0/template",
    save: "/variables/fields/1"
  });
  expect(new UnifoldDocumentCompiler(1, { layoutRegistry: registry }).prepare(source).status).toBe(
    UnifoldPreparationStatus.Valid
  );
});

it("reports external template failures at the registry source pointer", () => {
  const source = layoutDocument();
  const definition = source.layouts[0];
  if (definition === undefined) throw new Error("Missing layout definition fixture.");
  definition.template.type = "MissingComponent";
  const registry = createTrustedLayoutDefinitionRegistry(source.layouts);
  Reflect.deleteProperty(source, "layouts");
  const result = prepareUnifoldDocument(source, { layoutRegistry: registry });
  expect(result.status).toBe(UnifoldPreparationStatus.Invalid);
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: "/$layoutRegistry/definitions/0/template/type" })
    ])
  );
});

it("caches successful JSON preparation with isolated results and bounded LRU retention", () => {
  const compiler = new UnifoldDocumentCompiler(1);
  const first = compiler.prepare(authoredDocument("1"));
  const cached = compiler.prepare(authoredDocument("1"));
  expect(first.status).toBe(UnifoldPreparationStatus.Valid);
  expect(cached).toEqual(first);
  expect(cached).not.toBe(first);
  expect(cached.prepared).not.toBe(first.prepared);
  expect(compiler.cachedDocumentCount).toBe(1);
  expect(compiler.prepare(authoredDocument("2")).status).toBe(UnifoldPreparationStatus.Valid);
  expect(compiler.cachedDocumentCount).toBe(1);
  compiler.clear();
  expect(compiler.cachedDocumentCount).toBe(0);
});

it("never serves a cached result for non-JSON input and validates cache capacity", () => {
  const compiler = new UnifoldDocumentCompiler();
  expect(compiler.prepare(authoredDocument()).status).toBe(UnifoldPreparationStatus.Valid);
  expect(compiler.prepare({ ...authoredDocument(), invalid: undefined }).status).toBe(
    UnifoldPreparationStatus.Invalid
  );
  expect(compiler.cachedDocumentCount).toBe(1);
  expect(() => new UnifoldDocumentCompiler(0)).toThrow("positive integer");
  expect(() => new UnifoldDocumentCompiler(1.5)).toThrow("positive integer");
});

function requirePrepared(result: UnifoldPreparationResult) {
  if (result.prepared === undefined) throw new Error("Expected a prepared document.");
  return result.prepared;
}
