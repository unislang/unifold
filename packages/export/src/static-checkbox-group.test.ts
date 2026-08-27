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

import { renderStaticCheckboxGroup } from "./static-checkbox-group.js";

it("renders escaped native repeated checkboxes with public selection", () => {
  const node = groupNode();
  const html = renderStaticCheckboxGroup({ document: irDocument(node), node });
  expect(html).toContain("<legend>Topics &amp; alerts</legend>");
  expect(html.match(/data-unifold-static-control="topics"/gu)).toHaveLength(3);
  expect(html).toContain('type="checkbox" name="topics" value="news" checked');
  expect(html).toContain('value="internal" disabled');
  expect(html).not.toContain("aria-required");
  expect(html).toContain("Security &lt;alerts&gt;");
});

it("redacts classified selection while preserving declared options", () => {
  const node = groupNode(DataClassification.Restricted);
  const html = renderStaticCheckboxGroup({ document: irDocument(node), node });
  expect(html).not.toContain('value="news" checked');
  expect(html).toContain('value="news"');
});

it("never projects a checked disabled option", () => {
  const source = groupNode();
  const node = { ...source, properties: { ...source.properties, value: ["internal"] } };
  const html = renderStaticCheckboxGroup({ document: irDocument(node), node });
  expect(html).toContain('value="internal" disabled');
  expect(html).not.toContain('value="internal" checked');
});

function groupNode(
  dataClassification: DataClassification = DataClassification.Public
): UnifoldIrNode {
  return {
    ...(dataClassification === DataClassification.Public
      ? {}
      : { binding: { path: "/topics", store: "profile" } }),
    childIds: [],
    componentType: CoreComponentType.CheckboxGroup,
    eventBindings: {},
    id: "topics",
    kind: UiNodeKind.Control,
    properties: {
      label: "Topics & alerts",
      name: "topics",
      options: [
        { label: "Product news", value: "news" },
        { label: "Security <alerts>", value: "security" },
        { disabled: true, label: "Internal", value: "internal" }
      ],
      value: ["news"]
    },
    scopePath: ["topics"]
  };
}

function irDocument(node: UnifoldIrNode): UnifoldIrDocument {
  return {
    collectionBehaviorsById: {},
    compositionsByInstanceId: {},
    documentId: "checkbox-group-document",
    documentRevision: "1",
    irVersion: UnifoldIrVersion.Version1,
    machines: [],
    nodeIdentityAliases: {},
    nodesById: { topics: node },
    renderOrder: ["topics"],
    rootNodeId: "topics",
    rules: [],
    source: {
      documentSchemaVersion: UiSchemaVersion.Version1,
      jsonUiProfile: "test",
      jsonUiUpstreamRevision: JsonUiUpstreamRevision.Version01025
    },
    sourcePointersByNodeId: { topics: "/view" },
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
