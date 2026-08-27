import { UiControlNodeKind, UiControlTopologyVersion } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { validateControlTopology } from "./control-topology-validation.js";
import { DiagnosticCode } from "./enums.js";

const components = new Map([
  ["form", "Form"],
  ["layout", "Stack"],
  ["name", "TextField"]
]);

it("accepts a complete control graph independent of visual wrappers", () => {
  const diagnostics: import("./types.js").CompilerDiagnostic[] = [];
  validateControlTopology(
    {
      contractVersion: UiControlTopologyVersion.Version1,
      nodes: [
        { id: "form", kind: UiControlNodeKind.Form },
        { id: "layout", key: "profile", kind: UiControlNodeKind.Record, parentId: "form" },
        { id: "name", key: "name", kind: UiControlNodeKind.Control, parentId: "layout" }
      ]
    },
    components,
    diagnostics
  );
  expect(diagnostics).toEqual([]);
});

it("rejects missing coverage, duplicate durable keys, cycles, and incompatible targets", () => {
  const diagnostics: import("./types.js").CompilerDiagnostic[] = [];
  validateControlTopology(
    {
      contractVersion: "1.0.0",
      nodes: [
        { id: "form", key: "form", kind: "form", parentId: "layout" },
        { id: "layout", key: "layout", kind: "record", parentId: "form" },
        { id: "name", key: "form", kind: "control", parentId: "layout" }
      ]
    },
    components,
    diagnostics
  );
  expect(diagnostics.map(({ code }) => code)).toEqual(
    expect.arrayContaining([DiagnosticCode.InvalidControlTopology])
  );
  expect(diagnostics.map(({ path }) => path)).toEqual(
    expect.arrayContaining([
      "/controls/nodes/0/parentId",
      "/controls/nodes/1/parentId",
      "/controls/nodes/2/key"
    ])
  );
});
