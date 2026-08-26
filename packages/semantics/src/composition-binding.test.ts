import {
  UiCompositionExportKind,
  UiCompositionSelectionKind,
  UiNodeKind,
  type UiCompositionInstanceManifest
} from "@unislang/unifold-contracts";
import {
  DataClassification,
  UiControlStatus,
  UiUpdateTrigger,
  type UiNodeSnapshot
} from "@unislang/unifold-events";
import { expect, it } from "vitest";

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
  type SemanticCompilationSource,
  type SemanticGraph
} from "./index.js";

it("keeps semantic output stable across internal composition refactors", () => {
  const first = compileSemanticGraph(graph(), source("editor::name"));
  const refactored = compileSemanticGraph(graph(), source("editor::identity-field"));
  expect(first.status).toBe(SemanticCompilationStatus.Valid);
  expect(refactored.serialized).toBe(first.serialized);
  expect(first.serialized).toContain('"name":"Ada"');
});

it("rejects missing or non-control composition exports", () => {
  const invalid = source("editor::name");
  const instance = invalid.compositionsByInstanceId["editor"] as UiCompositionInstanceManifest;
  const result = compileSemanticGraph(graph("missing"), {
    ...invalid,
    compositionsByInstanceId: { editor: instance }
  });
  expect(result.diagnostics.map(({ code }) => code)).toContain(
    SemanticDiagnosticCode.InvalidCompositionExport
  );
});

function graph(exportName = "name"): SemanticGraph {
  return {
    contractVersion: SemanticContractVersion.Version1,
    entities: [
      {
        id: "urn:person:ada",
        properties: {
          name: {
            exportName,
            instanceId: "editor",
            kind: SemanticValueKind.CompositionExportControlValue
          }
        },
        type: "Person"
      }
    ],
    publication: {
      mode: SemanticPublicationMode.PublicPage,
      profile: SemanticPublicationProfile.SchemaOrg
    },
    vocabulary: { release: SchemaOrgRelease.Version30, uri: SchemaOrgVocabularyUri.Canonical }
  };
}

function source(nodeId: string): SemanticCompilationSource {
  return {
    compositionsByInstanceId: { editor: instance(nodeId) },
    snapshots: { [nodeId]: snapshot(nodeId) }
  };
}

function instance(nodeId: string): UiCompositionInstanceManifest {
  return {
    ancestry: ["editor"],
    definitionName: "ProfileEditor",
    definitionSourcePointer: "/compositions/0",
    definitionVersion: "1.0.0",
    exports: {
      name: {
        kind: UiCompositionExportKind.Selection,
        localId: "name",
        nodeId,
        selection: UiCompositionSelectionKind.ControlValue
      }
    },
    instanceId: "editor",
    instanceSourcePointer: "/view",
    rootNodeId: "editor"
  };
}

function snapshot(id: string): UiNodeSnapshot {
  return {
    attributes: {},
    base: baseState(),
    control: controlState(),
    definitionVersion: "1.0.0",
    id,
    instanceId: "editor",
    kind: UiNodeKind.Control,
    properties: {},
    revision: 1,
    scopePath: ["editor", id],
    type: "TextField"
  };
}

function baseState() {
  return {
    busy: false,
    dataClassification: DataClassification.Public,
    disabled: false,
    focused: false,
    interactive: true,
    mounted: true,
    readonly: false,
    visible: true
  };
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
