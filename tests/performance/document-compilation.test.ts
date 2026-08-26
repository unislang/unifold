import { UnifoldPreparationStatus, type UnifoldPreparationResult } from "@unislang/unifold";
import { expect, it } from "vitest";

import {
  FIVE_HUNDRED_DOCUMENT_NODES,
  FIVE_HUNDRED_COMPOSITION_INSTANCES,
  COMPOSED_DOCUMENT_NODES,
  TWO_THOUSAND_DOCUMENT_NODES,
  compileCachedDocument,
  compileComposedDocument,
  compileComposedRevision,
  compileColdDocument,
  createCompilationDocument,
  createDocumentCompilationHarness,
  normalizeLargeDocument
} from "./document-compilation-fixture.js";

it("compiles exact 500-node and 2,000-node schema-valid documents through public boundaries", () => {
  const harness = createDocumentCompilationHarness();
  const cold = compileColdDocument(harness);
  const cached = compileCachedDocument(harness);
  const large = normalizeLargeDocument(harness);

  expect(cold.status).toBe(UnifoldPreparationStatus.Valid);
  expect(requireDocument(cold).renderOrder).toHaveLength(FIVE_HUNDRED_DOCUMENT_NODES);
  expect(cached).toEqual(cold);
  expect(cached).not.toBe(cold);
  expect(harness.cachedCompiler.cachedDocumentCount).toBe(1);
  expect(large.status).toBe(UnifoldPreparationStatus.Valid);
  expect(requireDocument(large).renderOrder).toHaveLength(TWO_THOUSAND_DOCUMENT_NODES);
  expect(() => createCompilationDocument(0)).toThrow("positive integer");
});

it("compiles 500 composition instances and preserves unaffected node identity across revisions", () => {
  const harness = createDocumentCompilationHarness();
  const composed = compileComposedDocument(harness);
  const composedRevision = compileComposedRevision(harness);

  const composedDocument = requireDocument(composed);
  const revisedDocument = requireDocument(composedRevision);
  expect(composedDocument.renderOrder).toHaveLength(COMPOSED_DOCUMENT_NODES);
  expect(composedDocument.compositionsByInstanceId).toHaveProperty(
    `composed-${String(FIVE_HUNDRED_COMPOSITION_INSTANCES - 1).padStart(5, "0")}`
  );
  expect(requireNode(revisedDocument, "composed-00250::field").properties["label"]).toBe(
    "Changed label"
  );
  expect(requireNode(revisedDocument, "composed-00249::field").id).toBe(
    requireNode(composedDocument, "composed-00249::field").id
  );
});

function requireDocument(result: UnifoldPreparationResult) {
  if (result.prepared === undefined) throw new Error("Expected a prepared document.");
  return result.prepared.document;
}

function requireNode(document: ReturnType<typeof requireDocument>, nodeId: string) {
  const node = document.nodesById[nodeId];
  if (node === undefined) throw new Error(`Expected compiled node '${nodeId}'.`);
  return node;
}
