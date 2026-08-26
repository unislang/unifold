import { expect, it } from "vitest";

import { DiagnosticCode } from "./enums.js";
import { validateSemanticGraph } from "./semantic-validation.js";
import type { CompilerDiagnostic } from "./types.js";

it("accepts absent and structurally valid semantic graphs", () => {
  expect(diagnosticsFor(undefined)).toEqual([]);
  expect(diagnosticsFor(validGraph())).toEqual([]);
});

it("reports exact document paths for malformed semantic graphs", () => {
  const graph = validGraph();
  Reflect.deleteProperty(graph.entities[0] as object, "properties");
  const diagnostics = diagnosticsFor(graph);

  expect(diagnostics).toContainEqual(
    expect.objectContaining({
      code: DiagnosticCode.InvalidSemanticGraph,
      path: "/semantics/entities/0/properties"
    })
  );
});

function diagnosticsFor(value: unknown): readonly CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  validateSemanticGraph(value, diagnostics);
  return diagnostics;
}

function validGraph() {
  return {
    contractVersion: "1.0.0",
    entities: [
      {
        id: "https://example.com/people/ada",
        properties: { name: { kind: "constant", value: "Ada" } },
        type: "Person"
      }
    ],
    publication: { mode: "public-page", profile: "schema.org" },
    vocabulary: { release: "30.0", uri: "https://schema.org" }
  };
}
