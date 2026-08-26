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

import { renderStaticNumberField } from "./static-number-field.js";

it("renders one bounded native numeric fallback with public value", () => {
  const node = numberNode();
  const html = renderStaticNumberField({ document: irDocument(node), node });
  expect(html).toContain("<span>Age</span>");
  expect(html).toContain('data-unifold-static-control="age" type="number"');
  expect(html).toContain('min="0" max="130" step="0.5" value="42.5"');
  expect(html).toContain(" required");
});

it("redacts a non-public numeric value while preserving the native control", () => {
  const node = numberNode(DataClassification.Restricted);
  const document = irDocument(node);
  expect(renderStaticNumberField({ document, node })).toContain('value=""');
});

function numberNode(
  dataClassification: DataClassification = DataClassification.Public
): UnifoldIrNode {
  return {
    ...(dataClassification === DataClassification.Public
      ? {}
      : { binding: { path: "/age", store: "profile" } }),
    childIds: [],
    componentType: CoreComponentType.NumberField,
    eventBindings: {},
    id: "age",
    kind: UiNodeKind.Control,
    properties: {
      label: "Age",
      max: 130,
      min: 0,
      name: "age",
      required: true,
      step: 0.5,
      value: 42.5
    },
    scopePath: ["age"]
  };
}

function irDocument(node: UnifoldIrNode): UnifoldIrDocument {
  return {
    compositionsByInstanceId: {},
    documentId: "number-document",
    documentRevision: "1",
    irVersion: UnifoldIrVersion.Version1,
    machines: [],
    nodeIdentityAliases: {},
    nodesById: { age: node },
    renderOrder: ["age"],
    rootNodeId: "age",
    rules: [],
    source: {
      documentSchemaVersion: UiSchemaVersion.Version1,
      jsonUiProfile: "test",
      jsonUiUpstreamRevision: JsonUiUpstreamRevision.Version01025
    },
    sourcePointersByNodeId: { age: "/view" },
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
