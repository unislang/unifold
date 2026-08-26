import { DataClassification } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  completeStaticDocument,
  maliciousStaticDocument,
  prepareTestDocument,
  semanticDocument
} from "./static-html.test-data.js";
import { compileStaticSemantics } from "./static-semantics.js";

it("emits a deterministic empty Schema.org graph when no graph is authored", () => {
  const result = compileStaticSemantics(prepareTestDocument(completeStaticDocument()));
  expect(result.diagnostics).toEqual([]);
  expect(result.serialized).toBe('{"@context":"https://schema.org","@graph":[]}');
});

it("compiles public bindings and script-escapes semantic constants", () => {
  const publicResult = compileStaticSemantics(prepareTestDocument(semanticDocument()));
  expect(publicResult.serialized).toContain('"name":"Ada"');
  const payload = `</script><script>globalThis.compromised=true</script>`;
  const unsafeResult = compileStaticSemantics(
    prepareTestDocument(maliciousStaticDocument(payload))
  );
  expect(unsafeResult.serialized).toContain("\\u003c/script>");
  expect(unsafeResult.serialized).not.toContain("</script>");
});

it("rejects semantic bindings to every non-public classification", () => {
  const classifications = [
    DataClassification.Internal,
    DataClassification.Confidential,
    DataClassification.Restricted,
    DataClassification.NeverExport
  ];
  classifications.forEach((classification) => {
    const result = compileStaticSemantics(
      prepareTestDocument(semanticDocument(classification, "classified-secret"))
    );
    expect(result.serialized).toBeUndefined();
    expect(result.diagnostics.map(({ code }) => code)).toContain("non-public-binding");
  });
});
