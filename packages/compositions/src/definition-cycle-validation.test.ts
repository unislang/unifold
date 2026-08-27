import { expect, it } from "vitest";

import { detectDefinitionCycles, type CompositionEdge } from "./definition-cycle-validation.js";
import { CompositionDiagnosticCode } from "./enums.js";
import type { CompositionDiagnostic } from "./types.js";

it("reports definition cycles without rejecting an acyclic graph", () => {
  const diagnostics: CompositionDiagnostic[] = [];
  detectDefinitionCycles(
    new Map([
      ["first", [edge("second")]],
      ["second", [edge("first")]],
      ["leaf", []]
    ]),
    diagnostics
  );

  expect(diagnostics).toEqual([
    expect.objectContaining({ code: CompositionDiagnosticCode.Cycle, path: "/first" })
  ]);
});

function edge(key: string): CompositionEdge {
  return { key, label: key, path: `/${key}` };
}
