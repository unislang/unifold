import type { JsonObject } from "@unislang/unifold-contracts";

export function workflowStoreDocument(): JsonObject {
  return {
    $schema: "https://schemas.unifold.org/ui-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    compositions: [],
    id: "workflow-store",
    jsonUiProfile: {
      name: "unifold-jsonui",
      upstream: "5401b3d4900ca3032c108d6db00e8a819f4b28e9",
      version: "1.0.0"
    },
    revision: "1",
    schemaVersion: "1.0.0",
    stores: [storeDefinition()],
    view: wizardView()
  };
}

function wizardView(): JsonObject {
  return {
    $comp: "Wizard",
    $children: [
      { $comp: "Text", content: "Account", id: "account-panel" },
      { $comp: "Text", content: "Review", id: "review-panel" }
    ],
    id: "account-wizard",
    label: "Create account",
    path: "/step",
    steps: [
      { id: "account", label: "Account" },
      { id: "review", label: "Review" }
    ],
    store: "workflow",
    value: "account"
  };
}

function storeDefinition(): JsonObject {
  return {
    access: "read-write-draft",
    classification: "internal",
    id: "workflow",
    initialData: "required",
    maxBytes: 1_024,
    migrations: { maximum: "2.9.0", minimum: "2.0.0" },
    ownership: "host",
    persistence: "session",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: { step: { enum: ["account", "review"], type: "string" } },
      required: ["step"],
      type: "object"
    },
    schemaVersion: "1.0.0",
    source: { kind: "host" }
  };
}
