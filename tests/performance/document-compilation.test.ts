import { UnifoldPreparationStatus } from "@unislang/unifold";
import { expect, it } from "vitest";

import {
  FIVE_HUNDRED_DOCUMENT_NODES,
  TWO_THOUSAND_DOCUMENT_NODES,
  compileCachedDocument,
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
  expect(cold.prepared?.document.renderOrder).toHaveLength(FIVE_HUNDRED_DOCUMENT_NODES);
  expect(cached).toEqual(cold);
  expect(cached).not.toBe(cold);
  expect(harness.cachedCompiler.cachedDocumentCount).toBe(1);
  expect(large.status).toBe(UnifoldPreparationStatus.Valid);
  expect(large.prepared?.document.renderOrder).toHaveLength(TWO_THOUSAND_DOCUMENT_NODES);
  expect(() => createCompilationDocument(0)).toThrow("positive integer");
});
