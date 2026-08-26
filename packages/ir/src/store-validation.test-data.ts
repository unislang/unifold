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
  UiStoreSourceKind,
  type UiDocument,
  type UiStoreDefinition
} from "@unislang/unifold-contracts";

export function boundDocument(): UiDocument {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: CoreCatalogName.UnifoldCore, version: CoreCatalogVersion.Version1 },
    id: "bound-customer",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    stores: [customerStore()],
    view: {
      $comp: "TextField",
      id: "name",
      label: "Name",
      path: "/name",
      store: "customer"
    }
  };
}

export function customerStore(values: Partial<UiStoreDefinition> = {}): UiStoreDefinition {
  return {
    access: UiStoreAccess.ReadWriteDraft,
    classification: DataClassification.Internal,
    id: "customer",
    initialData: UiStoreInitialDataPolicy.Required,
    maxBytes: 65_536,
    migrations: { maximum: "2.9.0", minimum: "2.0.0" },
    ownership: UiStoreOwnership.Host,
    persistence: UiStorePersistence.Session,
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: { name: { type: "string" }, subscribed: { type: "boolean" } },
      required: ["name"],
      type: "object"
    },
    schemaVersion: UiStoreSchemaVersion.Version1,
    source: { kind: UiStoreSourceKind.Host },
    ...values
  };
}

export function dataGridValueSchema() {
  return {
    additionalProperties: false,
    properties: {
      selectedRowIds: { items: { type: "string" }, type: "array" },
      sort: {
        additionalProperties: false,
        properties: {
          direction: { enum: ["ascending", "descending"], type: "string" },
          key: { type: "string" }
        },
        required: ["direction", "key"],
        type: "object"
      }
    },
    required: ["selectedRowIds"],
    type: "object"
  };
}
