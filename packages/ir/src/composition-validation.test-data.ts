import {
  CoreCatalogName,
  CoreCatalogVersion,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiCompositionExportKind,
  UiCompositionManifestVersion,
  UiCompositionSelectionKind,
  UiContractSchemaUri,
  UiSchemaVersion,
  type UiCompositionInstanceManifest,
  type UiDocument
} from "@unislang/unifold-contracts";

export function composedDocument(): UiDocument {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositionManifest: {
      contractVersion: UiCompositionManifestVersion.Version1,
      instances: [compositionInstance()],
      nodeProvenanceById: {
        editor: provenance("root", "/compositions/0/template"),
        "editor::name": provenance("name", "/compositions/0/template/$children/0")
      }
    },
    id: "fixture",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view: {
      $children: [{ $comp: "TextField", id: "editor::name", value: "" }],
      $comp: "Composition",
      id: "editor"
    }
  };
}

function compositionInstance(): UiCompositionInstanceManifest {
  return {
    ancestry: ["editor"],
    definitionName: "ProfileEditor",
    definitionSourcePointer: "/compositions/0",
    definitionVersion: "1.0.0",
    exports: {
      name: {
        kind: UiCompositionExportKind.Selection,
        localId: "name",
        nodeId: "editor::name",
        selection: UiCompositionSelectionKind.ControlValue
      }
    },
    instanceId: "editor",
    instanceSourcePointer: "/view",
    rootNodeId: "editor"
  };
}

function provenance(localId: string, definitionSourcePointer: string) {
  return {
    ancestry: ["editor"],
    definitionName: "ProfileEditor",
    definitionSourcePointer,
    definitionVersion: "1.0.0",
    instanceId: "editor",
    instanceSourcePointer: "/view",
    localId
  };
}
