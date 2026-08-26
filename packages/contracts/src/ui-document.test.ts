import { Ajv2020 } from "ajv/dist/2020.js";
import { expect, it } from "vitest";

import derivedRuleSchema from "../schemas/derived-rule.schema.json" with { type: "json" };
import schema from "../schemas/ui-document.schema.json" with { type: "json" };
import semanticSchema from "../schemas/semantic-graph.schema.json" with { type: "json" };
import {
  DataClassification,
  UiStoreAccess,
  UiStoreInitialDataPolicy,
  UiStoreOwnership,
  UiStorePersistence,
  UiStoreSchemaVersion,
  UiStoreSourceKind
} from "./store.js";
import * as subject from "./ui-document.js";

const validateDocument = new Ajv2020({ allErrors: true, allowUnionTypes: true, strict: true })
  .addSchema(derivedRuleSchema)
  .addSchema(semanticSchema)
  .compile(schema);

it("loads through its colocated contract", () => {
  expect(subject).toBeDefined();
});

it("keeps the profile enums and executable schema pin aligned", () => {
  const properties = schema.$defs.jsonUiProfile.properties;
  expect(properties.name.enum).toEqual([subject.JsonUiProfileName.Unifold]);
  expect(properties.version.enum).toEqual([subject.JsonUiProfileVersion.Version1]);
  expect(properties.upstream.enum).toEqual([subject.JsonUiUpstreamRevision.Version01025]);
});

it("keeps the catalog enums and executable schema pin aligned", () => {
  const properties = schema.$defs.catalogReference.properties;
  expect(properties.name.enum).toEqual([subject.CoreCatalogName.UnifoldCore]);
  expect(properties.version.enum).toEqual([subject.CoreCatalogVersion.Version1]);
});

it("executes enum-backed hierarchical node event bindings", () => {
  const valid = baseDocument();
  const events = { [subject.UiComponentEventBinding.SubmitRequested]: "FORM_SUBMIT" };
  Object.assign(valid.view, { events });
  expect(validateDocument(valid)).toBe(true);
  Object.assign(events, { click: "FORM_SUBMIT" });
  expect(validateDocument(valid)).toBe(false);
});

it("executes the closed derived-rule JSON Schema boundary", () => {
  const valid = documentWithRule();
  expect(validateDocument(valid)).toBe(true);
  requireRuleInput(valid).pointer = "/revision";
  expect(validateDocument(valid)).toBe(false);
});

it("executes the machine JSON Schema boundary", () => {
  const valid = documentWithMachine();
  requireMachine(valid).states.editing["on"] = {
    SUBMIT: { guard: "has-name", target: "editing" }
  };

  expect(validateDocument(valid)).toBe(true);
  const machine = requireMachine(valid);
  machine.states.editing["on"] = { SUBMIT: { guard: "", target: "editing" } };
  expect(validateDocument(valid)).toBe(false);
});

it("executes the registered SemanticGraph schema boundary", () => {
  const valid = documentWithSemantics();
  expect(validateDocument(valid)).toBe(true);

  Object.assign(valid.semantics.entities[0]?.properties.name ?? {}, { kind: "script" });
  expect(validateDocument(valid)).toBe(false);
});

it("uses non-empty machine IDs and bounded store IDs", () => {
  const machineDocument = documentWithMachine();
  requireMachine(machineDocument).id = "workflow/customer";
  expect(validateDocument(machineDocument)).toBe(true);
  const storeDocument = documentWithStore();
  requireStore(storeDocument).id = "customer/data";
  storeDocument.view.store = "customer/data";
  expect(validateDocument(storeDocument)).toBe(false);
});

it("bounds RFC 6901 store paths", () => {
  const rootPath = documentWithStore();
  rootPath.view.path = "";
  expect(validateDocument(rootPath)).toBe(true);
  const boundary = documentWithStore();
  boundary.view.path = `/${"a".repeat(2_047)}`;
  expect(validateDocument(boundary)).toBe(true);
  const oversized = documentWithStore();
  oversized.view.path = `/${"a".repeat(2_048)}`;
  expect(validateDocument(oversized)).toBe(false);
  const malformed = documentWithStore();
  malformed.view.path = "/name~2invalid";
  expect(validateDocument(malformed)).toBe(false);
});

it("requires store and path as a pair", () => {
  const missingPath = documentWithStore();
  Reflect.deleteProperty(missingPath.view, "path");
  const missingStore = documentWithStore();
  Reflect.deleteProperty(missingStore.view, "store");
  expect([missingPath, missingStore].map((value) => validateDocument(value))).toEqual([
    false,
    false
  ]);
});

it("keeps stores, sources, and migration ranges closed", () => {
  const storeExtension = documentWithStore();
  Object.assign(requireStore(storeExtension), { unexpected: true });
  const sourceExtension = documentWithStore();
  Object.assign(requireStore(sourceExtension).source, { unexpected: true });
  const migrationExtension = documentWithStore();
  Object.assign(requireStore(migrationExtension).migrations, { unexpected: true });
  expect(
    [storeExtension, sourceExtension, migrationExtension].map((value) => validateDocument(value))
  ).toEqual([false, false, false]);
});

function documentWithMachine() {
  return {
    ...baseDocument(),
    machines: [
      {
        id: "workflow",
        initial: "editing",
        ownerId: "form",
        schemaVersion: "1.0.0",
        states: { editing: {} as Record<string, unknown> },
        version: "1.0.0"
      }
    ]
  };
}

function documentWithStore() {
  return {
    ...baseDocument(),
    stores: [storeDefinition()],
    view: { $comp: "TextField", id: "name", path: "/name", store: "customer" }
  };
}

function documentWithSemantics() {
  return {
    ...baseDocument(),
    semantics: {
      contractVersion: "1.0.0",
      entities: [
        {
          id: "https://example.com/people/ada",
          properties: { name: { kind: "constant", value: "Ada" } },
          type: "Person"
        }
      ],
      publication: { mode: "public-page", profile: "schema.org" },
      vocabulary: { release: "30.0", uri: "https://schema.org" }
    }
  };
}

function documentWithRule() {
  return {
    ...baseDocument(),
    rules: [
      {
        expression: { "!": [{ var: "accepted" }] },
        id: "disable-submit",
        inputs: [{ name: "accepted", nodeId: "form", pointer: "/properties/accepted" }],
        output: { kind: "control-set-disabled", nodeId: "form" },
        schemaVersion: "1.0.0",
        version: "1.0.0"
      }
    ]
  };
}

function baseDocument() {
  return {
    $schema: subject.UiContractSchemaUri.Version1,
    catalog: {
      name: subject.CoreCatalogName.UnifoldCore,
      version: subject.CoreCatalogVersion.Version1
    },
    id: "profile",
    jsonUiProfile: {
      name: subject.JsonUiProfileName.Unifold,
      upstream: subject.JsonUiUpstreamRevision.Version01025,
      version: subject.JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: subject.UiSchemaVersion.Version1,
    view: { $comp: "Form", id: "form" }
  };
}

function storeDefinition() {
  return {
    access: UiStoreAccess.ReadWriteDraft,
    classification: DataClassification.Internal,
    id: "customer",
    initialData: UiStoreInitialDataPolicy.Required,
    maxBytes: 65_536,
    migrations: { maximum: "2.9.0", minimum: "2.0.0" },
    ownership: UiStoreOwnership.Host,
    persistence: UiStorePersistence.Session,
    schema: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object" },
    schemaVersion: UiStoreSchemaVersion.Version1,
    source: { kind: UiStoreSourceKind.Host }
  };
}

function requireMachine(document: ReturnType<typeof documentWithMachine>) {
  const machine = document.machines[0];
  if (machine === undefined) throw new Error("Expected a machine fixture.");
  return machine;
}

function requireStore(document: ReturnType<typeof documentWithStore>) {
  const store = document.stores[0];
  if (store === undefined) throw new Error("Expected a store fixture.");
  return store;
}

function requireRuleInput(document: ReturnType<typeof documentWithRule>) {
  const input = document.rules[0]?.inputs[0];
  if (input === undefined) throw new Error("Expected a rule input fixture.");
  return input;
}
