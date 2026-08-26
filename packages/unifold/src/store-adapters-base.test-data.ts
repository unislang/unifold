import {
  CoreCatalogName,
  CoreCatalogVersion,
  DataClassification,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  UiStoreAccess,
  UiStoreInitialDataPolicy,
  UiStoreOwnership,
  UiStorePersistence,
  UiStoreSchemaVersion,
  UiStoreSourceKind
} from "@unislang/unifold-contracts";

export function boundDocument() {
  return {
    ...baseDocument(),
    stores: [storeDefinition()],
    view: { $comp: "TextField", id: "name", path: "/name", store: "customer" }
  };
}

export function storeDefinition(initialData = UiStoreInitialDataPolicy.Required) {
  return {
    access: UiStoreAccess.ReadWriteDraft,
    classification: DataClassification.Internal,
    id: "customer",
    initialData,
    maxBytes: 65536,
    migrations: { maximum: "2.9.0", minimum: "2.0.0" },
    ownership: UiStoreOwnership.Host,
    persistence: UiStorePersistence.Session,
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: {
        constructor: { type: "string" },
        name: { minLength: 2, type: "string" },
        toString: { type: "string" }
      },
      required: ["name"],
      type: "object"
    },
    schemaVersion: UiStoreSchemaVersion.Version1,
    source: { kind: UiStoreSourceKind.Host }
  };
}

function baseDocument() {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    compositions: [],
    id: "bound",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view: { $comp: "TextField", id: "name" }
  };
}
