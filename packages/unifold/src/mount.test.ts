// @vitest-environment happy-dom
import {
  DataClassification,
  SemanticContractVersion,
  SemanticPublicationMode,
  SemanticPublicationProfile,
  SemanticValueKind,
  SchemaOrgRelease,
  SchemaOrgVocabularyUri,
  UiStoreAccess,
  UiStoreInitialDataPolicy,
  UiStoreOwnership,
  UiStorePersistence,
  UiStoreSchemaVersion,
  UiStoreSourceKind
} from "@unislang/unifold-contracts";
import { UiCommandType, UiEventPhase, UiEventType, type UiEvent } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { authoredDocument, workflowDefinition } from "./application.test-data.js";
import {
  createMemoryStoreAdapter,
  mountUnifoldApplication,
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationMountMode,
  UnifoldApplicationMountStatus,
  UnifoldApplicationUpdateStatus,
  type MountUnifoldApplicationResult,
  type UnifoldApplicationPort
} from "./index.js";

it("upgrades validated static DOM while preserving control state and focus", async () => {
  const container = staticApplicationContainer();
  document.body.append(container);
  const fallback = requireInput(container);
  fallback.value = "Grace";
  fallback.focus();
  const focus = vi.spyOn(HTMLInputElement.prototype, "focus");
  installSemanticScript("test-application", emptySemanticGraph);

  const application = requireApplication(
    mountUnifoldApplication(authoredDocument(), container, {
      mountMode: UnifoldApplicationMountMode.UpgradeStatic
    })
  );
  const field = requireElement(application.renderer.getElement("name"));
  await waitForUpdate(field);

  expect(application.runtime.getSnapshot("name").control).toMatchObject({
    initialValue: "Grace",
    pristine: true,
    value: "Grace"
  });
  expect(Reflect.get(field, "value")).toBe("Grace");
  expect(focus.mock.instances).toContain(requireShadowInput(field));
  focus.mockRestore();
  expect(container.querySelector("input")).not.toBe(fallback);
  disposeApplication(application, container);
});

it("rejects a tampered static DOM without replacing its fallback content", () => {
  const container = staticApplicationContainer();
  const fallback = container.firstElementChild;
  const name = container.querySelector<HTMLElement>("[data-unifold-static-node-id='name']");
  name?.setAttribute("data-unifold-static-component", "Button");

  const result = mountUnifoldApplication(authoredDocument(), container, {
    mountMode: UnifoldApplicationMountMode.UpgradeStatic
  });

  expect(result.status).toBe(UnifoldApplicationMountStatus.Rejected);
  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Renderer);
  expect(container.firstElementChild).toBe(fallback);
});

it("atomically adopts static-export semantics while upgrading its DOM", () => {
  const authored = semanticAuthoredDocument();
  const container = staticApplicationContainer();
  document.body.append(container);
  const exported = installSemanticScript("test-application", '{"name":"Static"}');

  const application = requireApplication(
    mountUnifoldApplication(authored, container, {
      mountMode: UnifoldApplicationMountMode.UpgradeStatic
    })
  );

  const runtime = requireSemanticScript();
  expect(exported.isConnected).toBe(false);
  expect(runtime.dataset["unifoldSemantics"]).not.toBe("test-application");
  expect(JSON.parse(runtime.textContent ?? "")).toMatchObject({
    "@graph": [{ "@id": "person", name: "Ada" }]
  });
  expect(document.head.querySelectorAll("[data-unifold-semantics]")).toHaveLength(1);
  disposeApplication(application, container);
  expect(runtime.isConnected).toBe(false);
});

it("preserves static fallback and publication when semantic ownership conflicts", () => {
  const container = staticApplicationContainer();
  document.body.append(container);
  const fallback = container.firstElementChild;
  const competitor = installSemanticScript("another-document", '{"name":"Competitor"}');

  const result = mountUnifoldApplication(semanticAuthoredDocument(), container, {
    mountMode: UnifoldApplicationMountMode.UpgradeStatic
  });

  expect(result.status).toBe(UnifoldApplicationMountStatus.Rejected);
  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Semantics);
  expect(container.firstElementChild).toBe(fallback);
  expect(requireSemanticScript()).toBe(competitor);
  expect(competitor.textContent).toBe('{"name":"Competitor"}');
  competitor.remove();
  container.remove();
});

it("restores static node identity, value, and focus after application setup fails", () => {
  const container = staticApplicationContainer();
  document.body.append(container);
  const fallback = container.firstElementChild;
  const input = requireInput(container);
  input.value = "Grace";
  input.focus();
  const exported = installSemanticScript("test-application", emptySemanticGraph);

  const result = mountUnifoldApplication(
    { ...authoredDocument(), machines: [workflowDefinition()] },
    container,
    { mountMode: UnifoldApplicationMountMode.UpgradeStatic }
  );

  expect(result.status).toBe(UnifoldApplicationMountStatus.Rejected);
  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Workflow);
  expect(container.firstElementChild).toBe(fallback);
  expect(requireInput(container)).toBe(input);
  expect(input.value).toBe("Grace");
  expect(document.activeElement).toBe(input);
  expect(exported.isConnected).toBe(true);
  exported.remove();
  container.remove();
});

it("reports a missing trusted store adapter at the store mount stage", () => {
  const authored = authoredDocument();
  const result = mountUnifoldApplication(
    {
      ...authored,
      stores: [storeDefinition()],
      view: { $comp: "TextField", id: "name", path: "/name", store: "customer" }
    },
    document.createElement("div")
  );
  expect(result.status).toBe(UnifoldApplicationMountStatus.Rejected);
  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Store);
});

it("hydrates and selectively writes a typed store binding", verifyTypedStoreBinding);

it("switches store authorization and hydration atomically on application update", async () => {
  const adapter = createMemoryStoreAdapter("2.1.0", { alias: "Countess", name: "Ada" });
  const application = requireApplication(
    mountUnifoldApplication(boundDocument(), document.createElement("div"), {
      storeAdapters: { customer: adapter }
    })
  );

  const result = application.update(boundDocument("/alias", "2"));
  application.runtime.execute([
    { id: "name", type: UiCommandType.ControlSetValue, value: "Grace" }
  ]);

  expect(result.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(application.runtime.getSnapshot("name").control?.value).toBe("Grace");
  expect(adapter.snapshot()).toEqual({ alias: "Grace", name: "Ada" });
  application.dispose();
});

async function verifyTypedStoreBinding(): Promise<void> {
  const container = document.createElement("div");
  document.body.append(container);
  const adapter = createMemoryStoreAdapter("2.1.0", { name: "Ada" });
  const result = mountUnifoldApplication(boundDocument(), container, {
    storeAdapters: { customer: adapter }
  });
  const application = requireApplication(result);
  const field = requireElement(application.renderer.getElement("name"));
  const sibling = requireElement(application.renderer.getElement("details"));
  await waitForUpdate(field);
  expect(Reflect.get(field, "value")).toBe("Ada");
  const siblingSnapshot = application.runtime.getSnapshot("details");
  const siblingRenderCount = sibling.dataset["unifoldRenderCount"];
  const events: UiEvent[] = [];
  const subscription = application.runtime.events$.subscribe((event) => events.push(event));
  const record = application.runtime.execute([
    { id: "name", type: UiCommandType.ControlSetValue, value: "Grace" }
  ]);
  await waitForUpdate(field);
  expect(application.runtime.getSnapshot("name").control?.value).toBe("Grace");
  expect(Reflect.get(field, "value")).toBe("Grace");
  expect(adapter.snapshot()).toEqual({ name: "Grace" });
  expect(record.changedNodeIds).not.toContain("details");
  expect(application.runtime.getSnapshot("details")).toBe(siblingSnapshot);
  expect(sibling.dataset["unifoldRenderCount"]).toBe(siblingRenderCount);
  expectStoreEvents(events);
  subscription.unsubscribe();
  disposeApplication(application, container);
}

function disposeApplication(application: UnifoldApplicationPort, container: HTMLElement): void {
  application.dispose();
  container.remove();
}

function expectStoreEvents(events: readonly UiEvent[]): void {
  const storeEvents = events.filter(isStoreEvent);
  expect(storeEvents.map(({ type }) => type)).toEqual([
    UiEventType.CommandApplied,
    UiEventType.EffectRequested,
    UiEventType.EffectCompleted
  ]);
  expect(storeEvents.map(({ data }) => data.phase)).toEqual([
    UiEventPhase.State,
    UiEventPhase.Effect,
    UiEventPhase.Effect
  ]);
  expect(storeEvents.every(({ data }) => data.sourceNode?.id === "name")).toBe(true);
  expect(storeEvents.every(({ data }) => data.snapshot === undefined)).toBe(true);
  expect(JSON.stringify(storeEvents)).not.toContain("Grace");
}

function isStoreEvent(event: UiEvent): boolean {
  return (
    JSON.stringify(event.data.change) ===
    JSON.stringify({
      commandType: UiCommandType.StoreWrite
    })
  );
}

function boundDocument(path = "/name", revision = "1") {
  return {
    ...authoredDocument(revision),
    stores: [storeDefinition()],
    view: {
      $children: [
        { $comp: "TextField", id: "name", label: "Name", path, store: "customer" },
        { $comp: "Button", id: "details", label: "Details" }
      ],
      $comp: "Form",
      id: "form",
      label: "Profile"
    }
  };
}

function requireApplication(result: MountUnifoldApplicationResult): UnifoldApplicationPort {
  expect(result.status).toBe(UnifoldApplicationMountStatus.Mounted);
  if (result.status === UnifoldApplicationMountStatus.Rejected) {
    throw new Error(`Expected a mounted application: ${JSON.stringify(result.diagnostics)}`);
  }
  return result.application;
}

function requireElement(element: HTMLElement | undefined): HTMLElement {
  if (element === undefined) throw new Error("Rendered element is missing.");
  return element;
}

function staticApplicationContainer(): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = `<form data-unifold-static-document="test-application" data-unifold-static-node-id="form" data-unifold-static-component="Form"><label data-unifold-static-node-id="name" data-unifold-static-component="TextField">Name<input data-unifold-static-control="name" value=""></label></form>`;
  return container;
}

function semanticAuthoredDocument() {
  return {
    ...authoredDocument(),
    semantics: {
      contractVersion: SemanticContractVersion.Version1,
      entities: [
        {
          id: "person",
          properties: { name: { kind: SemanticValueKind.Constant, value: "Ada" } },
          type: "Person"
        }
      ],
      publication: {
        mode: SemanticPublicationMode.PublicPage,
        profile: SemanticPublicationProfile.SchemaOrg
      },
      vocabulary: { release: SchemaOrgRelease.Version30, uri: SchemaOrgVocabularyUri.Canonical }
    }
  };
}

function installSemanticScript(ownerId: string, serialized: string): HTMLScriptElement {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset["unifoldSemantics"] = ownerId;
  script.textContent = serialized;
  document.head.append(script);
  return script;
}

function requireSemanticScript(): HTMLScriptElement {
  const script = document.head.querySelector<HTMLScriptElement>("[data-unifold-semantics]");
  if (script === null) throw new Error("Semantic script is missing.");
  return script;
}

function requireInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Static input is missing.");
  return input;
}

function requireShadowInput(element: HTMLElement): HTMLInputElement {
  const root = element.shadowRoot;
  if (root === null) throw new Error("Rendered shadow root is missing.");
  const input = root.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Rendered input is missing.");
  return input;
}

async function waitForUpdate(element: HTMLElement): Promise<void> {
  await (element as HTMLElement & { readonly updateComplete: Promise<boolean> }).updateComplete;
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
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      properties: { alias: { type: "string" }, name: { type: "string" } },
      required: ["name"],
      type: "object"
    },
    schemaVersion: UiStoreSchemaVersion.Version1,
    source: { kind: UiStoreSourceKind.Host }
  };
}
const emptySemanticGraph = '{"@context":"https://schema.org","@graph":[]}';
