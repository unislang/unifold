import {
  CoreComponentType,
  DataClassification,
  JsonUiUpstreamRevision,
  UiNodeKind,
  UiSchemaVersion,
  UiStoreAccess,
  UiStoreInitialDataPolicy,
  UiStoreOwnership,
  UiStorePersistence,
  UiStoreSchemaVersion,
  UiStoreSourceKind,
  type UiStoreDefinition
} from "@unislang/unifold-contracts";
import { UnifoldIrVersion, type UnifoldIrDocument, type UnifoldIrNode } from "@unislang/unifold-ir";
import { expect, it } from "vitest";

import { renderStaticSearchField } from "./static-search-field.js";

it("renders one escaped native search fallback with public state", () => {
  const node = searchNode();
  const html = renderStaticSearchField({ document: irDocument(node), node });
  expect(html).toContain("<span>Search profiles</span>");
  expect(html).toContain('data-unifold-static-control="query" type="search"');
  expect(html).toContain('autocomplete="off" enterkeyhint="search"');
  expect(html).toContain('maxlength="2048"');
  expect(html).toContain('name="profileSearch"');
  expect(html).toContain('value="Ada &amp; Grace"');
});

it("redacts a non-public search query while preserving native semantics", () => {
  const node = searchNode(DataClassification.Restricted);
  expect(renderStaticSearchField({ document: irDocument(node), node })).toContain('value=""');
});

function searchNode(
  dataClassification: DataClassification = DataClassification.Public
): UnifoldIrNode {
  return {
    ...(dataClassification === DataClassification.Public
      ? {}
      : { binding: { path: "/query", store: "profile" } }),
    childIds: [],
    componentType: CoreComponentType.SearchField,
    eventBindings: {},
    id: "query",
    kind: UiNodeKind.Control,
    properties: {
      autocomplete: "off",
      label: "Search profiles",
      name: "profileSearch",
      value: "Ada & Grace"
    },
    scopePath: ["query"]
  };
}

function irDocument(node: UnifoldIrNode): UnifoldIrDocument {
  return {
    collectionBehaviorsById: {},
    compositionsByInstanceId: {},
    documentId: "search-document",
    documentRevision: "1",
    irVersion: UnifoldIrVersion.Version1,
    machines: [],
    nodeIdentityAliases: {},
    nodesById: { query: node },
    renderOrder: ["query"],
    rootNodeId: "query",
    rules: [],
    source: {
      documentSchemaVersion: UiSchemaVersion.Version1,
      jsonUiProfile: "test",
      jsonUiUpstreamRevision: JsonUiUpstreamRevision.Version01025
    },
    sourcePointersByNodeId: { query: "/view" },
    storesById:
      node.binding === undefined ? {} : { profile: classifiedStore(DataClassification.Restricted) }
  };
}

function classifiedStore(classification: DataClassification): UiStoreDefinition {
  return {
    access: UiStoreAccess.ReadOnly,
    classification,
    id: "profile",
    initialData: UiStoreInitialDataPolicy.Optional,
    maxBytes: 1024,
    migrations: { maximum: "1.0.0", minimum: "1.0.0" },
    ownership: UiStoreOwnership.Host,
    persistence: UiStorePersistence.Memory,
    schema: { type: "object" },
    schemaVersion: UiStoreSchemaVersion.Version1,
    source: { kind: UiStoreSourceKind.Host }
  };
}
