import { expect, it } from "vitest";

import {
  prepareUnifoldDocument,
  UnifoldDocumentCompiler,
  UnifoldPreparationStatus
} from "./index.js";
import { authoredDocument } from "./application.test-data.js";

it("expands and compiles an authored document through one public boundary", () => {
  const result = prepareUnifoldDocument(authoredDocument());
  expect(result.status).toBe(UnifoldPreparationStatus.Valid);
  expect(result.prepared?.document.renderOrder).toEqual(["form", "name"]);
});

it("reports staged diagnostics without a partial prepared document", () => {
  const result = prepareUnifoldDocument({ compositions: [], view: {} });
  expect(result.status).toBe(UnifoldPreparationStatus.Invalid);
  expect(result.prepared).toBeUndefined();
  expect(result.diagnostics[0]?.stage).toBeDefined();
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
