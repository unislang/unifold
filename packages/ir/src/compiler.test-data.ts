import {
  CoreCatalogName,
  CoreCatalogVersion,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  SchemaOrgRelease,
  SchemaOrgVocabularyUri,
  SemanticContractVersion,
  SemanticPublicationMode,
  SemanticPublicationProfile,
  SemanticValueKind,
  UiContractSchemaUri,
  UiSchemaVersion,
  type SemanticGraph,
  type UiDocument
} from "@unislang/unifold-contracts";

export function compilerDocument(): UiDocument {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    id: "customer-editor",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "revision-1",
    schemaVersion: UiSchemaVersion.Version1,
    view: {
      $children: [
        { $comp: "TextField", id: "email", label: "Email", required: true },
        { $comp: "Button", id: "save", label: "Save" }
      ],
      $comp: "Form",
      id: "customer-form",
      label: "Customer"
    }
  };
}

export function compilerSemanticGraph(): SemanticGraph {
  return {
    contractVersion: SemanticContractVersion.Version1,
    entities: [
      {
        id: "https://example.com/people/ada",
        properties: {
          description: { kind: SemanticValueKind.Constant, value: "Compiler" },
          name: { kind: SemanticValueKind.NodeControlValue, nodeId: "email" }
        },
        type: "Person"
      }
    ],
    publication: {
      mode: SemanticPublicationMode.PublicPage,
      profile: SemanticPublicationProfile.SchemaOrg
    },
    vocabulary: {
      release: SchemaOrgRelease.Version30,
      uri: SchemaOrgVocabularyUri.Canonical
    }
  };
}
