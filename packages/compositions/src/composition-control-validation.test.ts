import { UiControlNodeKind, UiControlTopologyVersion } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { validateCompositionControlTopology } from "./composition-control-validation.js";
import { CompositionContractVersion, CompositionDiagnosticCode } from "./enums.js";
import type { CompositionDefinition, CompositionDiagnostic } from "./types.js";

it("validates unused local topology ownership and relationships", () => {
  const diagnostics: CompositionDiagnostic[] = [];
  validateCompositionControlTopology(
    definition(),
    new Map([["field", "/field"]]),
    "/d",
    diagnostics
  );

  expect(diagnostics.map(({ code }) => code)).toEqual(
    expect.arrayContaining([
      CompositionDiagnosticCode.InvalidControlTopology,
      CompositionDiagnosticCode.UnknownControlNode,
      CompositionDiagnosticCode.UnknownControlParent
    ])
  );
});

function definition(): CompositionDefinition {
  return {
    contractVersion: CompositionContractVersion.Version2,
    controls: {
      contractVersion: UiControlTopologyVersion.Version1,
      nodes: [
        { id: "field", kind: UiControlNodeKind.Control, parentId: "missing" },
        { id: "second", kind: UiControlNodeKind.Form }
      ]
    },
    exports: {},
    name: "Invalid",
    parameters: {},
    slots: [],
    template: { $comp: "Composition", id: "root" },
    version: "1"
  };
}
