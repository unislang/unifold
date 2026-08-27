import { DiagnosticCode } from "./enums.js";
import { parseControlTopology } from "./control-topology-parser.js";
import { expect, it } from "vitest";

it("parses closed enum-backed topology definitions", () => {
  const diagnostics: import("./types.js").CompilerDiagnostic[] = [];
  expect(
    parseControlTopology(
      { contractVersion: "1.0.0", nodes: [{ id: "form", kind: "form" }] },
      diagnostics
    )
  ).toEqual([{ id: "form", kind: "form", path: "/controls/nodes/0" }]);
  expect(diagnostics).toEqual([]);
});

it("reports malformed and extended topology values", () => {
  const diagnostics: import("./types.js").CompilerDiagnostic[] = [];
  parseControlTopology(
    { contractVersion: "future", nodes: [{ id: "", kind: "other", extra: true }] },
    diagnostics
  );
  expect(diagnostics.every(({ code }) => code === DiagnosticCode.InvalidControlTopology)).toBe(
    true
  );
  expect(diagnostics.map(({ path }) => path)).toEqual(
    expect.arrayContaining([
      "/controls/contractVersion",
      "/controls/nodes/0/extra",
      "/controls/nodes/0/id",
      "/controls/nodes/0/kind"
    ])
  );
});
