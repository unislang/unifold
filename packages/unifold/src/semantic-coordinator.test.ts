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

it("isolates tenant publications through failure, update, and reverse disposal", () => {
  const first = constantSemanticDocument("Tenant one");
  const second = constantSemanticDocument("Tenant two");
  const invalid = semanticDocument(SemanticValueKind.NodeControlValue, "missing");
  const firstCoordinator = automaticCoordinator();
  const secondCoordinator = automaticCoordinator();

  firstCoordinator.publish(first.document, snapshots(first));
  secondCoordinator.publish(second.document, snapshots(second));
  firstCoordinator.refresh(invalid.document, snapshots(invalid));
  expect(semanticNames()).toEqual(["Tenant one", "Tenant two"]);

  firstCoordinator.publish(
    constantSemanticDocument("Tenant one updated").document,
    snapshots(first)
  );
  expect(semanticNames()).toEqual(["Tenant one updated", "Tenant two"]);
  secondCoordinator.dispose();
  expect(semanticNames()).toEqual(["Tenant one updated"]);
  firstCoordinator.dispose();
  expect(semanticScripts()).toHaveLength(0);
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

it("adopts its static owner without modifying another application", () => {
  const prepared = semanticDocument(SemanticValueKind.Constant);
  const competitor = installSemanticScript("another-document", '{"name":"Competitor"}');
  const expected = installSemanticScript(prepared.document.documentId, '{"name":"Static"}');
  const coordinator = automaticCoordinator(prepared.document.documentId);

  coordinator.publish(prepared.document, snapshots(prepared));
  expect(expected.isConnected).toBe(false);
  expect(competitor.isConnected).toBe(true);
  expect(competitor.textContent).toBe('{"name":"Competitor"}');
  expect(semanticNames()).toEqual(["Competitor", "Ada"]);
  coordinator.dispose();
  expect(competitor.isConnected).toBe(true);
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

it("does not dispose a publication whose owner marker was changed", () => {
  const prepared = semanticDocument(SemanticValueKind.Constant);
  const coordinator = automaticCoordinator();
  coordinator.publish(prepared.document, snapshots(prepared));
  const publication = semanticScript();
  publication.dataset["unifoldSemantics"] = "foreign-owner";

  coordinator.dispose();

  expect(publication.isConnected).toBe(true);
  expect(publication.dataset["unifoldSemantics"]).toBe("foreign-owner");
  publication.remove();
});

function automaticCoordinator(adoptedOwnerId?: string): UiSemanticCoordinator {
  return new UiSemanticCoordinator(
    document,
    UnifoldSemanticPublicationMode.Automatic,
    adoptedOwnerId
  );
}

function semanticDocument(kind: SemanticValueKind, nodeId?: string): PreparedUnifoldDocument {
  return compileSemanticDocument(kind, "Ada", nodeId);
}

function constantSemanticDocument(constant: string): PreparedUnifoldDocument {
  return compileSemanticDocument(SemanticValueKind.Constant, constant);
}

function compileSemanticDocument(
  kind: SemanticValueKind,
  constant: string,
  nodeId?: string
): PreparedUnifoldDocument {
  const result = prepareUnifoldDocument({
    ...authoredDocument(),
    semantics: {
      contractVersion: SemanticContractVersion.Version1,
      entities: [
        {
          id: "person",
          properties: { name: semanticValue(kind, nodeId, constant) },
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

function semanticValue(kind: SemanticValueKind, nodeId: string | undefined, constant: string) {
  return kind === SemanticValueKind.Constant
    ? { kind, value: constant }
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
  const script = semanticScripts()[0];
  if (script === undefined) throw new Error("Semantic script is missing.");
  return script;
}

function semanticScripts(): readonly HTMLScriptElement[] {
  return [...document.head.querySelectorAll<HTMLScriptElement>("[data-unifold-semantics]")];
}

function semanticNames(): readonly unknown[] {
  return semanticScripts().map(semanticName);
}

function semanticName(script: HTMLScriptElement): unknown {
  const value = parseSemanticNameFixture(script);
  const graph = value["@graph"];
  if (graph === undefined) return value.name;
  const first = graph[0];
  if (first === undefined) return undefined;
  return first.name;
}

function parseSemanticNameFixture(script: HTMLScriptElement): SemanticNameFixture {
  return JSON.parse(script.textContent ?? "{}") as SemanticNameFixture;
}

interface SemanticNameFixture {
  readonly "@graph"?: readonly { readonly name?: unknown }[];
  readonly name?: unknown;
}

function installSemanticScript(ownerId: string, serialized: string): HTMLScriptElement {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset["unifoldSemantics"] = ownerId;
  script.textContent = serialized;
  document.head.append(script);
  return script;
}
