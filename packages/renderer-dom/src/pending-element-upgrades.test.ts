// @vitest-environment happy-dom
import { CoreComponentType, type JsonObject } from "@unislang/unifold-contracts";
import { UiNodeKind, UnifoldIrVersion, type UnifoldIrDocument } from "@unislang/unifold-ir";
import { Window } from "happy-dom";
import { expect, it, vi } from "vitest";

import {
  createNodeSnapshot,
  renderIrDocument,
  type PendingElementDefinitionOptions
} from "./index.js";

it("defers pending-upgrade loading until after synchronous mount", () => {
  const queued: VoidFunction[] = [];
  const enqueue = vi
    .spyOn(globalThis, "queueMicrotask")
    .mockImplementation((callback) => queued.push(callback));

  const fixture = pendingFixture();

  expect(queued).toHaveLength(1);
  expect(fixture.element.dataset["replayedLabel"]).toBeUndefined();
  enqueue.mockRestore();
  queued.forEach((callback) => callback());
  fixture.controller.dispose();
});

it("replays the latest renderer projection after a compatible late upgrade", async () => {
  const fixture = pendingFixture();
  const updated = tooltipDocument("Updated", "2");
  fixture.controller.update(updated);
  const snapshot = createNodeSnapshot(nodeWithLabel(updated, "Projected"), 7);
  fixture.controller.project(snapshot);

  definePending(fixture);
  await settledUpgrade(fixture.realm, "unifold-tooltip");

  expect(fixture.element.dataset["replayedLabel"]).toBe("Projected");
  expect(Reflect.get(fixture.element, "eventNode")).toBe(snapshot);
  expect(Reflect.get(fixture.element, "runtimeContext")).toMatchObject({
    documentId: "late-upgrade",
    documentRevision: "2",
    locale: "en"
  });
});

it("does not replay a host removed before its definition arrives", async () => {
  const fixture = pendingFixture();
  fixture.controller.update(buttonDocument());

  definePending(fixture);
  await settledUpgrade(fixture.realm, "unifold-tooltip");

  expect(fixture.element.dataset["replayedLabel"]).toBeUndefined();
  expect(fixture.controller.getElement("help")).not.toBe(fixture.element);
});

it("does not replay after disposal or into a rejected definition", async () => {
  const disposed = pendingFixture();
  disposed.controller.dispose();
  definePending(disposed);
  await settledUpgrade(disposed.realm, "unifold-tooltip");
  expect(disposed.element.dataset["replayedLabel"]).toBeUndefined();

  const rejected = configuredPendingFixture(() => false, tooltipDocument("Initial", "1"));
  definePending(rejected);
  await settledUpgrade(rejected.realm, "unifold-tooltip");
  expect(rejected.element.dataset["replayedLabel"]).toBeUndefined();
});

it("adopts current children without moving a light-DOM scaffold into itself", async () => {
  const fixture = configuredPendingFixture(() => true, tooltipWithChildDocument());
  const child = fixture.controller.getElement("action");

  definePending(fixture);
  await settledUpgrade(fixture.realm, "unifold-tooltip");

  const container = Reflect.get(fixture.element, "unifoldChildContainer") as HTMLElement;
  expect(container.firstElementChild).toBe(child);
  expect(fixture.element.children).toHaveLength(1);
});

function pendingFixture() {
  return configuredPendingFixture(() => true, tooltipDocument("Initial", "1"));
}

function configuredPendingFixture(acceptsDefinition: () => boolean, source: UnifoldIrDocument) {
  const realm = new Window();
  const container = realm.document.createElement("div") as unknown as HTMLElement;
  const controller = renderIrDocument(source, container, {
    pendingElementDefinitions: { acceptsDefinition, registry: registryPort(realm) },
    runtimeContext: { locale: "en" }
  });
  const element = controller.getElement("help");
  if (element === undefined) throw new Error("Pending tooltip is missing.");
  return { container, controller, element, realm };
}

function replayElement(realm: Window): CustomElementConstructor {
  return class extends realm.HTMLElement {
    constructor() {
      super();
      installLightContainer(this as unknown as HTMLElement);
      Reflect.set(this, "eventNode", undefined);
      Reflect.set(this, "label", "constructor-default");
      Reflect.set(this, "runtimeContext", { documentId: "constructor" });
    }

    set label(value: string) {
      this.dataset["replayedLabel"] = value;
    }

    get unifoldChildContainer(): HTMLElement | undefined {
      return this.querySelector("[data-children]") as unknown as HTMLElement | undefined;
    }
  } as unknown as CustomElementConstructor;
}

function definePending(fixture: ReturnType<typeof pendingFixture>): void {
  const definition = replayElement(fixture.realm);
  fixture.realm.customElements.define(
    "unifold-tooltip",
    definition as unknown as typeof fixture.realm.HTMLElement
  );
  emulateUpgradeWhenNeeded(fixture.element, definition);
}

function emulateUpgradeWhenNeeded(
  element: HTMLElement,
  definition: CustomElementConstructor
): void {
  if (Reflect.getPrototypeOf(element) === definition.prototype) return;
  Reflect.set(element, "eventNode", undefined);
  Reflect.set(element, "label", "constructor-default");
  Reflect.set(element, "runtimeContext", { documentId: "constructor" });
  Reflect.setPrototypeOf(element, definition.prototype);
  installLightContainer(element);
}

function installLightContainer(element: HTMLElement): void {
  const scaffold = element.ownerDocument.createElement("section");
  const children = element.ownerDocument.createElement("div");
  children.dataset["children"] = "";
  scaffold.append(children);
  element.append(scaffold);
}

function registryPort(realm: Window): PendingElementDefinitionOptions["registry"] {
  return {
    get: (tagName) =>
      realm.customElements.get(tagName) as unknown as CustomElementConstructor | undefined,
    whenDefined: async (tagName) =>
      (await realm.customElements.whenDefined(tagName)) as unknown as CustomElementConstructor
  };
}

async function settledUpgrade(realm: Window, tagName: string): Promise<void> {
  await realm.customElements.whenDefined(tagName);
  await import("./pending-element-upgrades.js");
  await Promise.resolve();
  await Promise.resolve();
}

function tooltipDocument(label: string, revision: string): UnifoldIrDocument {
  return documentWithNode(tooltipNode(label), "late-upgrade", revision);
}

function buttonDocument(): UnifoldIrDocument {
  return documentWithNode(
    baseNode(CoreComponentType.Button, UiNodeKind.Component, { label: "Replacement" }),
    "late-upgrade",
    "2"
  );
}

function tooltipWithChildDocument(): UnifoldIrDocument {
  const source = tooltipDocument("Initial", "1");
  return {
    ...source,
    nodesById: {
      action: {
        ...baseNode(CoreComponentType.Button, UiNodeKind.Component, { label: "Action" }),
        id: "action",
        parentId: "help",
        scopePath: ["help", "action"]
      },
      help: { ...requiredNode(source, "help"), childIds: ["action"] }
    },
    renderOrder: ["help", "action"],
    sourcePointersByNodeId: { action: "/view/$children/0", help: "/view" }
  };
}

function requiredNode(source: UnifoldIrDocument, id: string) {
  const node = source.nodesById[id];
  if (node === undefined) throw new Error(`IR node is missing: ${id}.`);
  return node;
}

function documentWithNode(
  node: UnifoldIrDocument["nodesById"][string],
  documentId: string,
  documentRevision: string
): UnifoldIrDocument {
  return {
    compositionsByInstanceId: {},
    documentId,
    documentRevision,
    irVersion: UnifoldIrVersion.Version1,
    machines: [],
    nodeIdentityAliases: {},
    nodesById: { help: node },
    renderOrder: ["help"],
    rootNodeId: "help",
    rules: [],
    source: {
      documentSchemaVersion: "1.0.0" as never,
      jsonUiProfile: "test",
      jsonUiUpstreamRevision: "test" as never
    },
    sourcePointersByNodeId: { help: "/view" },
    storesById: {}
  };
}

function tooltipNode(label: string) {
  return baseNode(CoreComponentType.Tooltip, UiNodeKind.Component, {
    content: "Helpful details",
    label
  });
}

function nodeWithLabel(document: UnifoldIrDocument, label: string) {
  const node = document.nodesById["help"];
  if (node === undefined) throw new Error("Tooltip node is missing.");
  return { ...node, properties: { ...node.properties, label } };
}

function baseNode(componentType: CoreComponentType, kind: UiNodeKind, properties: JsonObject) {
  return {
    childIds: [],
    componentType,
    eventBindings: {},
    id: "help",
    kind,
    properties,
    scopePath: ["help"]
  };
}
