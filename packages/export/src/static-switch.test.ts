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

import { renderStaticSwitch } from "./static-switch.js";

it("renders one deterministic escaped native switch fallback", () => {
  const node = switchNode();
  expect(renderStaticSwitch({ document: irDocument(node), node })).toBe(
    '<label><input data-unifold-static-control="notifications" aria-describedby="notifications-error" aria-invalid="true" type="checkbox" role="switch" name="account&amp;alerts" checked disabled required><span>Enable &lt;notifications&gt;</span></label><span id="notifications-error" role="alert">Review &amp; retry</span>'
  );
});

it("redacts non-public switch state while preserving its native semantics", () => {
  const node = switchNode(DataClassification.Restricted);
  const html = renderStaticSwitch({ document: irDocument(node), node });
  expect(html).toContain('type="checkbox" role="switch"');
  expect(html).not.toMatch(/ checked(?:\s|>)/u);
});

function switchNode(
  dataClassification: DataClassification = DataClassification.Public
): UnifoldIrNode {
  return {
    ...(dataClassification === DataClassification.Public
      ? {}
      : { binding: { path: "/notifications", store: "profile" } }),
    childIds: [],
    componentType: CoreComponentType.Switch,
    eventBindings: {},
    id: "notifications",
    kind: UiNodeKind.Control,
    properties: {
      disabled: true,
      errorMessage: "Review & retry",
      label: "Enable <notifications>",
      name: "account&alerts",
      required: true,
      value: true
    },
    scopePath: ["notifications"]
  };
}

function irDocument(node: UnifoldIrNode): UnifoldIrDocument {
  return {
    collectionBehaviorsById: {},
    compositionsByInstanceId: {},
    documentId: "switch-document",
    documentRevision: "1",
    irVersion: UnifoldIrVersion.Version1,
    machines: [],
    nodeIdentityAliases: {},
    nodesById: { notifications: node },
    renderOrder: ["notifications"],
    rootNodeId: "notifications",
    rules: [],
    source: {
      documentSchemaVersion: UiSchemaVersion.Version1,
      jsonUiProfile: "test",
      jsonUiUpstreamRevision: JsonUiUpstreamRevision.Version01025
    },
    sourcePointersByNodeId: { notifications: "/view" },
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
