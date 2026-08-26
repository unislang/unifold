import { DataClassification, type JsonObject } from "@unislang/unifold-contracts";

import { documentWithView } from "./static-html.test-data.js";

export function publicWizardDocument(): JsonObject {
  return documentWithView({
    $comp: "Wizard",
    $children: [
      { $comp: "Text", content: '<img src=x onerror="alert(1)"> account', id: "account-panel" },
      { $comp: "Text", content: "Review", id: "review-panel" }
    ],
    id: "account-wizard",
    label: "Create <account>",
    steps: [
      { description: "Enter <details>", id: "account", label: "Account" },
      { id: "review", label: "Review" }
    ],
    value: "review"
  });
}

export function classifiedStepperDocument(): JsonObject {
  return {
    ...documentWithView({
      $comp: "Stepper",
      id: "private-progress",
      label: "Private progress",
      path: "/step",
      steps: [{ id: "secret", label: "Secret step" }],
      store: "profile",
      value: "secret"
    }),
    stores: [storeDefinition()]
  };
}

function storeDefinition(): JsonObject {
  return {
    access: "read-only",
    classification: DataClassification.Restricted,
    id: "profile",
    initialData: "required",
    maxBytes: 1024,
    migrations: { maximum: "1.0.0", minimum: "1.0.0" },
    ownership: "host",
    persistence: "memory",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: { step: { type: "string" } },
      required: ["step"],
      type: "object"
    },
    schemaVersion: "1.0.0",
    source: { kind: "host" }
  };
}
