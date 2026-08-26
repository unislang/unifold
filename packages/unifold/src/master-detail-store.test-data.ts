import type { JsonObject } from "@unislang/unifold-contracts";

export function masterDetailStoreDocument(): JsonObject {
  return {
    $schema: "https://schemas.unifold.org/ui-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    compositions: [],
    id: "master-detail-store",
    jsonUiProfile: {
      name: "unifold-jsonui",
      upstream: "5401b3d4900ca3032c108d6db00e8a819f4b28e9",
      version: "1.0.0"
    },
    revision: "1",
    schemaVersion: "1.0.0",
    stores: [masterDetailStoreDefinition()],
    view: masterDetailView()
  };
}

function masterDetailView(): JsonObject {
  return {
    $comp: "MasterDetail",
    columns: [
      { key: "name", label: "Name" },
      { key: "status", label: "Status" }
    ],
    detailLabel: "Account details",
    id: "accounts",
    label: "Accounts",
    masterColumn: "name",
    path: "/selection",
    rows: [
      { cells: { name: "Ada", status: "Active" }, id: "ada" },
      { cells: { name: "Grace", status: "Pending" }, id: "grace" }
    ],
    store: "customer"
  };
}

function masterDetailStoreDefinition(): JsonObject {
  return {
    access: "read-write-draft",
    classification: "internal",
    id: "customer",
    initialData: "required",
    maxBytes: 65_536,
    migrations: { maximum: "2.9.0", minimum: "2.0.0" },
    ownership: "host",
    persistence: "session",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: { selection: { enum: ["ada", "grace"], type: "string" } },
      required: ["selection"],
      type: "object"
    },
    schemaVersion: "1.0.0",
    source: { kind: "host" }
  };
}
