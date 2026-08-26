export function dataGridStoreDocument() {
  return {
    $schema: "https://schemas.unifold.org/ui-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    compositions: [],
    id: "data-grid-store",
    jsonUiProfile: {
      name: "unifold-jsonui",
      upstream: "5401b3d4900ca3032c108d6db00e8a819f4b28e9",
      version: "1.0.0"
    },
    revision: "1",
    schemaVersion: "1.0.0",
    stores: [dataGridStoreDefinition()],
    view: {
      $comp: "DataGrid",
      caption: "People",
      columns: [{ key: "name", label: "Name" }],
      id: "grid",
      path: "/grid",
      rows: [{ cells: { name: "Ada" }, id: "ada" }],
      selectionMode: "multiple",
      sortableColumns: ["name"],
      store: "customer"
    }
  };
}

function dataGridStoreDefinition() {
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
      properties: { grid: dataGridPropertySchema() },
      required: ["grid"],
      type: "object"
    },
    schemaVersion: "1.0.0",
    source: { kind: "host" }
  };
}

function dataGridPropertySchema() {
  const string = { type: "string" };
  return {
    additionalProperties: false,
    properties: {
      selectedRowIds: { items: string, type: "array" },
      sort: {
        additionalProperties: false,
        properties: {
          direction: { enum: ["ascending", "descending"], ...string },
          key: string
        },
        required: ["direction", "key"],
        type: "object"
      }
    },
    required: ["selectedRowIds"],
    type: "object"
  };
}
