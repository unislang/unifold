// @vitest-environment happy-dom
import {
  SemanticContractVersion,
  SemanticPublicationMode,
  SemanticPublicationProfile,
  SemanticValueKind,
  SchemaOrgRelease,
  SchemaOrgVocabularyUri
} from "@unislang/unifold-contracts";
import { createNodeSnapshot } from "@unislang/unifold-renderer-dom";
import { expect, it } from "vitest";

import { authoredDocument } from "./application.test-data.js";
import { prepareUnifoldDocument } from "./compiler.js";
import { UiSemanticConfigurationError, UiSemanticCoordinator } from "./semantic-coordinator.js";
import {
  UnifoldPreparationStatus,
  UnifoldSemanticPublicationMode,
  type PreparedUnifoldDocument
} from "./types.js";

it("publishes one deterministic JSON-LD script and removes its owned script", () => {
  const prepared = semanticDocument(SemanticValueKind.Constant);
  const coordinator = automaticCoordinator();
  coordinator.publish(prepared.document, snapshots(prepared));
  const script = semanticScript();
  expect(JSON.parse(script.textContent ?? "")).toMatchObject({
    "@graph": [{ "@id": "person", "@type": "Person", name: "Ada" }]
  });
  coordinator.publish(prepared.document, snapshots(prepared));
  expect(document.head.querySelectorAll("[data-unifold-semantics]")).toHaveLength(1);
  coordinator.dispose();
  expect(document.head.querySelector("[data-unifold-semantics]")).toBeNull();
});

it("rejects invalid initial semantics and retains last-known-good runtime publication", () => {
  const valid = semanticDocument(SemanticValueKind.Constant);
  const invalid = semanticDocument(SemanticValueKind.NodeControlValue, "missing");
  const coordinator = automaticCoordinator();
  coordinator.publish(valid.document, snapshots(valid));
  const published = semanticScript().textContent;
  expect(() => coordinator.validate(invalid.document, snapshots(invalid))).toThrow(
    UiSemanticConfigurationError
  );
  coordinator.refresh(invalid.document, snapshots(invalid));
  expect(semanticScript().textContent).toBe(published);
  coordinator.dispose();
});

it("supports disabled publication and removes an owned graph when semantics are absent", () => {
  const prepared = semanticDocument(SemanticValueKind.Constant);
  const source = snapshots(prepared);
  const disabled = new UiSemanticCoordinator(document, UnifoldSemanticPublicationMode.Disabled);
  disabled.validate(prepared.document, source);
  disabled.publish(prepared.document, source);
  expect(document.head.querySelector("[data-unifold-semantics]")).toBeNull();

  const automatic = automaticCoordinator();
  automatic.publish(prepared.document, source);
  const { semantics: omitted, ...withoutSemantics } = prepared.document;
  expect(omitted).toBeDefined();
  automatic.publish(withoutSemantics, source);
  expect(document.head.querySelector("[data-unifold-semantics]")).toBeNull();
});

it("atomically adopts the semantic publication emitted by a static export", () => {
  const prepared = semanticDocument(SemanticValueKind.Constant);
  const exported = installSemanticScript(prepared.document.documentId, '{"name":"Static"}');
  const coordinator = automaticCoordinator(prepared.document.documentId);

  coordinator.publish(prepared.document, snapshots(prepared));

  const runtime = semanticScript();
  expect(exported.isConnected).toBe(false);
  expect(runtime.dataset["unifoldSemantics"]).not.toBe(prepared.document.documentId);
  expect(JSON.parse(runtime.textContent ?? "")).toMatchObject({
    "@graph": [{ "@id": "person", name: "Ada" }]
  });
  expect(document.head.querySelectorAll("[data-unifold-semantics]")).toHaveLength(1);
  coordinator.dispose();
});

it("rejects a competing semantic owner without modifying its publication", () => {
  const prepared = semanticDocument(SemanticValueKind.Constant);
  const competitor = installSemanticScript("another-document", '{"name":"Competitor"}');
  const coordinator = automaticCoordinator(prepared.document.documentId);

  expect(() => coordinator.validate(prepared.document, snapshots(prepared))).toThrow(
    UiSemanticConfigurationError
  );
  expect(semanticScript()).toBe(competitor);
  expect(competitor.textContent).toBe('{"name":"Competitor"}');
  competitor.remove();
});

it("rejects a missing static publication without creating one", () => {
  const prepared = semanticDocument(SemanticValueKind.Constant);
  const coordinator = automaticCoordinator(prepared.document.documentId);

  expect(() => coordinator.validate(prepared.document, snapshots(prepared))).toThrow(
    UiSemanticConfigurationError
  );
  expect(document.head.querySelectorAll("[data-unifold-semantics]")).toHaveLength(0);
});

it("rejects duplicate static publications without modifying either one", () => {
  const prepared = semanticDocument(SemanticValueKind.Constant);
  const first = installSemanticScript(prepared.document.documentId, '{"name":"First"}');
  const second = installSemanticScript(prepared.document.documentId, '{"name":"Second"}');
  const coordinator = automaticCoordinator(prepared.document.documentId);

  expect(() => coordinator.validate(prepared.document, snapshots(prepared))).toThrow(
    UiSemanticConfigurationError
  );
  expect([...document.head.querySelectorAll("[data-unifold-semantics]")]).toEqual([first, second]);
  expect([first.textContent, second.textContent]).toEqual([
    '{"name":"First"}',
    '{"name":"Second"}'
  ]);
  first.remove();
  second.remove();
});

function automaticCoordinator(adoptedOwnerId?: string): UiSemanticCoordinator {
  return new UiSemanticCoordinator(
    document,
    UnifoldSemanticPublicationMode.Automatic,
    adoptedOwnerId
  );
}

function semanticDocument(kind: SemanticValueKind, nodeId?: string): PreparedUnifoldDocument {
  const result = prepareUnifoldDocument({
    ...authoredDocument(),
    semantics: {
      contractVersion: SemanticContractVersion.Version1,
      entities: [
        {
          id: "person",
          properties: { name: semanticValue(kind, nodeId) },
          type: "Person"
        }
      ],
      publication: {
        mode: SemanticPublicationMode.PublicPage,
        profile: SemanticPublicationProfile.SchemaOrg
      },
      vocabulary: { release: SchemaOrgRelease.Version30, uri: SchemaOrgVocabularyUri.Canonical }
    }
  });
  if (result.status !== UnifoldPreparationStatus.Valid || result.prepared === undefined) {
    throw new Error("Semantic fixture did not compile.");
  }
  return result.prepared;
}

function semanticValue(kind: SemanticValueKind, nodeId?: string) {
  return kind === SemanticValueKind.Constant
    ? { kind, value: "Ada" }
    : { kind, nodeId: nodeId ?? "name" };
}

function snapshots(prepared: PreparedUnifoldDocument) {
  return Object.fromEntries(
    prepared.document.renderOrder.map((id) => {
      const node = prepared.document.nodesById[id];
      if (node === undefined) throw new Error(`Fixture node is missing: ${id}.`);
      return [id, createNodeSnapshot(node, 0)];
    })
  );
}

function semanticScript(): HTMLScriptElement {
  const script = document.head.querySelector<HTMLScriptElement>("[data-unifold-semantics]");
  if (script === null) throw new Error("Semantic script is missing.");
  return script;
}

function installSemanticScript(ownerId: string, serialized: string): HTMLScriptElement {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset["unifoldSemantics"] = ownerId;
  script.textContent = serialized;
  document.head.append(script);
  return script;
}
