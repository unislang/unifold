import { DataClassification, UiControlStatus, UiUpdateTrigger } from "@unislang/unifold-events";
import { UiNodeKind } from "@unislang/unifold-contracts";
import { describe, expect, it } from "vitest";

import {
  SchemaOrgRelease,
  SchemaOrgVocabularyUri,
  SemanticCompilationStatus,
  SemanticContractVersion,
  SemanticDiagnosticCode,
  SemanticPublicationMode,
  SemanticPublicationProfile,
  SemanticValueKind,
  compileSemanticGraph,
  type SemanticGraph,
  type SemanticSnapshotSource
} from "./index.js";

describe("compileSemanticGraph", () => {
  it("resolves a visible public committed value deterministically", compilesPublicGraph);
  it("rejects unknown vocabulary terms and unsafe bindings", rejectsUnsafeGraph);
  it("reports identity, reference, and binding failures", reportsGraphFailures);
  it("rejects an unsupported release", rejectsUnsupportedRelease);
});

function compilesPublicGraph(): void {
  const source = richGraph();
  const committed = snapshots(DataClassification.Public, true, true);
  const result = compileSemanticGraph(source, compilationSource(committed));
  expect(result.status).toBe(SemanticCompilationStatus.Valid);
  expect(result.diagnostics).toEqual([]);
  expect(result.serialized).toContain("\\u003c/script>safe");
  expect(result.serialized).toBe(
    compileSemanticGraph(source, compilationSource(committed)).serialized
  );
  expect(result.jsonLd?.["@graph"]).toHaveLength(2);
}

function rejectsUnsafeGraph(): void {
  const unsafe = snapshots(DataClassification.Restricted, false, false);
  const result = compileSemanticGraph(
    graph("Person", "unknownProperty"),
    compilationSource(unsafe)
  );
  const codes = result.diagnostics.map((item) => item.code);
  expect(result.status).toBe(SemanticCompilationStatus.Invalid);
  expect(codes).toEqual(
    expect.arrayContaining([
      SemanticDiagnosticCode.InvisibleBinding,
      SemanticDiagnosticCode.MissingControl,
      SemanticDiagnosticCode.NonPublicBinding,
      SemanticDiagnosticCode.UnknownProperty
    ])
  );
}

function reportsGraphFailures(): void {
  const entity = graph().entities[0];
  if (entity === undefined) throw new Error("Expected a semantic entity.");
  const empty = { ...entity, id: "" };
  const invalid = {
    ...graph(),
    primaryEntity: "missing",
    entities: [empty, empty, { ...entity, type: "UnknownType" }]
  };
  const result = compileSemanticGraph(invalid, compilationSource({}));
  const codes = result.diagnostics.map((item) => item.code);
  expect(codes).toEqual(
    expect.arrayContaining([
      SemanticDiagnosticCode.DuplicateEntityId,
      SemanticDiagnosticCode.EmptyEntityId,
      SemanticDiagnosticCode.MissingEntity,
      SemanticDiagnosticCode.MissingNode,
      SemanticDiagnosticCode.UnknownType
    ])
  );
}

function rejectsUnsupportedRelease(): void {
  const invalid = {
    ...graph(),
    vocabulary: { ...graph().vocabulary, release: "29.0" as SchemaOrgRelease }
  };
  const result = compileSemanticGraph(
    invalid,
    compilationSource(snapshots(DataClassification.Public, true, true))
  );
  expect(result.diagnostics[0]?.code).toBe(SemanticDiagnosticCode.UnsupportedRelease);
}

function richGraph(): SemanticGraph {
  const person = graph().entities[0];
  if (person === undefined) throw new Error("Expected a semantic entity.");
  return {
    ...graph(),
    entities: [
      {
        id: "urn:page:profile",
        type: "WebPage",
        properties: {
          mainEntity: { entityId: person.id, kind: SemanticValueKind.EntityReference },
          sameAs: {
            items: [{ kind: SemanticValueKind.Constant, value: "https://example.com/ada" }],
            kind: SemanticValueKind.List
          }
        }
      },
      person
    ]
  };
}

function graph(type = "Person", property = "name"): SemanticGraph {
  return {
    contractVersion: SemanticContractVersion.Version1,
    entities: [
      {
        id: "urn:person:ada",
        type,
        properties: {
          description: { kind: SemanticValueKind.Constant, value: "</script>safe" },
          [property]: { kind: SemanticValueKind.NodeControlValue, nodeId: "name" }
        }
      }
    ],
    primaryEntity: "urn:person:ada",
    publication: {
      mode: SemanticPublicationMode.PublicPage,
      profile: SemanticPublicationProfile.SchemaOrg
    },
    vocabulary: { release: SchemaOrgRelease.Version30, uri: SchemaOrgVocabularyUri.Canonical }
  };
}

function snapshots(
  classification: DataClassification,
  visible: boolean,
  control: boolean
): SemanticSnapshotSource {
  return { name: snapshot(classification, visible, control) };
}

function compilationSource(snapshots: SemanticSnapshotSource) {
  return { compositionsByInstanceId: {}, snapshots };
}

function snapshot(classification: DataClassification, visible: boolean, hasControl: boolean) {
  const base = {
    busy: false,
    dataClassification: classification,
    disabled: false,
    focused: false,
    interactive: true,
    mounted: true,
    readonly: false,
    visible
  };
  const value = {
    id: "name",
    instanceId: "name-1",
    kind: UiNodeKind.Control,
    type: "TextField",
    definitionVersion: "1.0.0",
    scopePath: ["name"],
    revision: 1,
    base,
    attributes: {},
    properties: {}
  };
  return hasControl ? { ...value, control: controlState() } : value;
}

function controlState() {
  return {
    dirty: true,
    errors: [],
    initialValue: "",
    pending: false,
    pristine: false,
    rawValue: "Ada",
    required: true,
    status: UiControlStatus.Valid,
    touched: true,
    updateOn: UiUpdateTrigger.Input,
    validatorIds: [],
    asyncValidatorIds: [],
    validationRequestId: null,
    value: "Ada"
  };
}
