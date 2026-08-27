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

import { renderStaticDateField } from "./static-date-field.js";

it("renders one bounded native date-only fallback with public value", () => {
  const node = dateNode();
  const html = renderStaticDateField({ document: irDocument(node), node });
  expect(html).toContain("<span>Start date</span>");
  expect(html).toContain('data-unifold-static-control="start-date" type="date"');
  expect(html).toContain('autocomplete="off" name="startDate"');
  expect(html).toContain('min="2025-01-01" max="2027-12-31" step="1" value="2026-08-26"');
  expect(html).toContain(" required");
});

it("redacts a non-public date while preserving its date-only constraints", () => {
  const node = dateNode(DataClassification.Restricted);
  const html = renderStaticDateField({ document: irDocument(node), node });
  expect(html).toContain('min="2025-01-01" max="2027-12-31" step="1" value=""');
});

function dateNode(
  dataClassification: DataClassification = DataClassification.Public
): UnifoldIrNode {
  return {
    ...(dataClassification === DataClassification.Public
      ? {}
      : { binding: { path: "/startDate", store: "profile" } }),
    childIds: [],
    componentType: CoreComponentType.DateField,
    eventBindings: {},
    id: "start-date",
    kind: UiNodeKind.Control,
    properties: {
      autocomplete: "off",
      label: "Start date",
      max: "2027-12-31",
      min: "2025-01-01",
      name: "startDate",
      required: true,
      step: 1,
      value: "2026-08-26"
    },
    scopePath: ["start-date"]
  };
}

function irDocument(node: UnifoldIrNode): UnifoldIrDocument {
  return {
    compositionsByInstanceId: {},
    documentId: "date-document",
    documentRevision: "1",
    irVersion: UnifoldIrVersion.Version1,
    machines: [],
    nodeIdentityAliases: {},
    nodesById: { "start-date": node },
    renderOrder: ["start-date"],
    rootNodeId: "start-date",
    rules: [],
    source: {
      documentSchemaVersion: UiSchemaVersion.Version1,
      jsonUiProfile: "test",
      jsonUiUpstreamRevision: JsonUiUpstreamRevision.Version01025
    },
    sourcePointersByNodeId: { "start-date": "/view" },
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
