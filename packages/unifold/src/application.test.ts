// @vitest-environment happy-dom
import { coreCatalog } from "@unislang/unifold-catalog";
import { CoreElementTag } from "@unislang/unifold-catalog";
import {
  UiDerivedRuleOutputKind,
  UiDerivedRuleSchemaVersion,
  type JsonObject
} from "@unislang/unifold-contracts";
import {
  ElementRegistrationDiagnosticCode,
  type UnifoldDataGrid
} from "@unislang/unifold-elements";
import { UiCommandType } from "@unislang/unifold-events";
import { createNodeSnapshot, type DomRenderController } from "@unislang/unifold-renderer-dom";
import { UnifoldRuntime } from "@unislang/unifold-runtime";
import { Window } from "happy-dom";
import { expect, it, vi } from "vitest";

import {
  UnifoldApplication,
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationMountStatus,
  UnifoldApplicationUpdateStatus,
  UnifoldPreparationStatus,
  createMemoryStoreAdapter,
  mountUnifoldApplication,
  prepareUnifoldDocument,
  type PreparedUnifoldDocument,
  type UnifoldApplicationPort
} from "./index.js";
import { prepareApplicationStores } from "./store-adapters.js";
import {
  authoredDocument,
  workflowCommandRegistry,
  workflowDefinition
} from "./application.test-data.js";
import { dataGridStoreDocument } from "./data-grid-store.test-data.js";

it("rejects an incompatible element registry before partial registration or rendering", () => {
  const realm = new Window();
  const container = realm.document.createElement("div") as unknown as HTMLElement;
  realm.customElements.define(CoreElementTag.Button, class extends realm.HTMLElement {});

  const result = mountUnifoldApplication(authoredDocument(), container);

  expect(result).toMatchObject({
    diagnostics: [
      {
        code: ElementRegistrationDiagnosticCode.ForeignDefinition,
        stage: UnifoldApplicationDiagnosticStage.ElementRegistration
      }
    ],
    status: UnifoldApplicationMountStatus.Rejected
  });
  expect(realm.customElements.get(CoreElementTag.TextField)).toBeUndefined();
  expect(container.children).toHaveLength(0);
});

it("mounts the complete pipeline and preserves state and focus across an update", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const application = requireApplication(mountUnifoldApplication(authoredDocument(), container));
  const name = requireElement(application, "name");
  await updateComplete(name);
  const input = requireInput(name);
  application.runtime.execute([
    { id: "name", type: UiCommandType.ControlSetValue, value: "User value" }
  ]);
  await updateComplete(name);
  input.focus();
  const update = application.update(authoredDocument("2", { button: true, label: "Full name" }));
  expect(update.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(application.runtime.getSnapshot("name")).toMatchObject({
    control: { dirty: true, value: "User value" },
    properties: { label: "Full name" }
  });
  expect(application.renderer.getElement("name")).toBe(name);
  expect(application.renderer.getElement("details")).toBeDefined();
  expect(name.shadowRoot?.activeElement).toBe(input);
  application.dispose();
  container.remove();
});

it("hydrates and writes the complete bound DataGrid value", async () => {
  const container = document.createElement("main");
  document.body.append(container);
  const adapter = createMemoryStoreAdapter("2.1.0", { grid: { selectedRowIds: [] } });
  const application = requireApplication(
    mountUnifoldApplication(dataGridStoreDocument(), container, {
      storeAdapters: { customer: adapter }
    })
  );
  const grid = requireElement(application, "grid") as UnifoldDataGrid;
  await grid.updateComplete;
  expect(grid.value).toEqual({ selectedRowIds: [] });
  requireShadowElement<HTMLButtonElement>(grid, "button").click();
  await grid.updateComplete;
  expect(adapter.snapshot()).toEqual({
    grid: { selectedRowIds: [], sort: { direction: "ascending", key: "name" } }
  });
  requireShadowElement<HTMLInputElement>(grid, "tbody input").click();
  await grid.updateComplete;
  expect(adapter.snapshot()).toEqual({
    grid: { selectedRowIds: ["ada"], sort: { direction: "ascending", key: "name" } }
  });
  application.dispose();
  container.remove();
});

it("replaces and evaluates a new derived-rule graph during document updates", () => {
  const container = document.createElement("div");
  const application = requireApplication(
    mountUnifoldApplication(authoredWithRule("1", "initial-empty"), container)
  );
  expect(application.runtime.getSnapshot("form").properties["label"]).toBe("initial-empty");
  const update = application.update(authoredWithRule("2", "updated-empty"));
  expect(update.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(application.runtime.getSnapshot("form").properties["label"]).toBe("updated-empty");
  application.dispose();
});

it("retains the last-known-good application after invalid input", () => {
  const container = document.createElement("div");
  const application = requireApplication(mountUnifoldApplication(authoredDocument(), container));
  const revision = application.runtime.revision;
  const name = application.renderer.getElement("name");
  const result = application.update({ compositions: [], view: {} });
  expect(result.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(application.runtime.revision).toBe(revision);
  expect(application.document.documentRevision).toBe("1");
  expect(application.renderer.getElement("name")).toBe(name);
  expect(application.authored).toMatchObject({ revision: "1" });
  application.dispose();
});

it("returns a defensive authored-source copy for deterministic export", () => {
  const container = document.createElement("div");
  const application = requireApplication(mountUnifoldApplication(authoredDocument(), container));
  const exported = application.authored as { revision: string };
  exported.revision = "mutated-outside";
  expect(application.authored).toMatchObject({ revision: "1" });
  application.dispose();
});

it("rejects renderer-incompatible updates before state mutation", () => {
  const container = document.createElement("div");
  const application = requireApplication(
    mountUnifoldApplication(authoredDocument(), container, {
      renderer: { catalog: withoutButton() }
    })
  );
  const name = application.renderer.getElement("name");
  const result = application.update(authoredDocument("2", { button: true }));
  expect(result.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Renderer);
  expect(application.runtime.revision).toBe(0);
  expect(application.renderer.getElement("name")).toBe(name);
  expect(application.renderer.getElement("details")).toBeUndefined();
  application.dispose();
});

it("restores runtime state when rendering fails after commit", () => {
  const prepared = requirePrepared(authoredDocument());
  const runtime = runtimeFor(prepared);
  const application = new UnifoldApplication(
    prepared,
    document.createElement("div"),
    runtime,
    failingRenderer(),
    prepareApplicationStores(prepared.document),
    {}
  );
  const result = application.update(authoredDocument("2", { label: "Full name" }));
  expect(result.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Renderer);
  expect(application.document.documentRevision).toBe("1");
  expect(runtime.getSnapshot("name").properties).toMatchObject({ label: "Name" });
  expect(runtime.revision).toBe(2);
  application.dispose();
});

it("restores application and runtime state when coordination fails after commit", () => {
  const prepared = requirePrepared(authoredDocument());
  const runtime = runtimeFor(prepared);
  const execute = runtime.execute.bind(runtime);
  let executions = 0;
  vi.spyOn(runtime, "execute").mockImplementation((commands, context) => {
    const record = execute(commands, context);
    executions += 1;
    if (executions === 1) throw new Error("Injected post-commit failure.");
    return record;
  });
  const application = new UnifoldApplication(
    prepared,
    document.createElement("div"),
    runtime,
    failingRenderer(false),
    prepareApplicationStores(prepared.document),
    {}
  );

  const result = application.update(authoredDocument("2", { label: "Full name" }));

  expect(result.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Runtime);
  expect(application.document.documentRevision).toBe("1");
  expect(runtime.getSnapshot("name").properties).toMatchObject({ label: "Name" });
  expect(runtime.revision).toBe(2);
  application.dispose();
});

it("mounts JSON workflow machines that emit typed runtime commands", () => {
  const application = requireApplication(
    mountUnifoldApplication(machineDocument(), document.createElement("div"), {
      machineCommands: workflowCommandRegistry()
    })
  );

  application.runtime.execute([{ id: "form", type: UiCommandType.FormSubmit }]);

  expect(application.machineState("profile-workflow")).toBe("saved");
  expect(application.runtime.getSnapshot("name").properties["label"]).toBe("Saved name");
  application.dispose();
});

it("rejects unknown machine commands before mounting", () => {
  const result = mountUnifoldApplication(machineDocument(), document.createElement("div"));

  expect(result.status).toBe(UnifoldApplicationMountStatus.Rejected);
  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Workflow);
});

it("retains the last-known-good workflow after an invalid machine update", () => {
  const application = requireApplication(
    mountUnifoldApplication(authoredDocument(), document.createElement("div"))
  );

  const result = application.update(machineDocument());

  expect(result.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Workflow);
  expect(application.document.machines).toEqual([]);
  expect(() => application.machineState("profile-workflow")).toThrow("Unknown machine");
  application.dispose();
});

function authoredWithRule(revision: string, emptyLabel: string): JsonObject {
  return {
    ...authoredDocument(revision),
    rules: [
      {
        expression: { if: [{ var: "name" }, "has-value", emptyLabel] },
        id: "form-label",
        inputs: [{ name: "name", nodeId: "name", pointer: "/control/value" }],
        output: {
          kind: UiDerivedRuleOutputKind.NodePatchProperty,
          nodeId: "form",
          property: "label"
        },
        schemaVersion: UiDerivedRuleSchemaVersion.Version1,
        version: "1.0.0"
      }
    ]
  };
}

function requireApplication(
  result: ReturnType<typeof mountUnifoldApplication>
): UnifoldApplicationPort {
  if (result.status !== UnifoldApplicationMountStatus.Mounted) {
    throw new Error(`Mount rejected: ${JSON.stringify(result.diagnostics)}`);
  }
  return result.application;
}

function requireElement(application: UnifoldApplicationPort, id: string): HTMLElement {
  const element = application.renderer.getElement(id);
  if (element === undefined) throw new Error(`Rendered element is missing: ${id}.`);
  return element;
}

function requireInput(element: HTMLElement): HTMLInputElement {
  const input = element.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Rendered input is missing.");
  return input;
}

function requireShadowElement<T extends Element>(host: HTMLElement, selector: string): T {
  const root = host.shadowRoot;
  if (root === null) throw new Error("Rendered shadow root is missing.");
  const element = root.querySelector<T>(selector);
  if (element === null) throw new Error(`Rendered ${selector} is missing.`);
  return element;
}

async function updateComplete(element: HTMLElement): Promise<void> {
  await (element as HTMLElement & { readonly updateComplete: Promise<boolean> }).updateComplete;
}

function withoutButton() {
  const components = { ...coreCatalog.components };
  Reflect.deleteProperty(components, "Button");
  return { ...coreCatalog, components };
}

function machineDocument() {
  return { ...authoredDocument(), machines: [workflowDefinition()] };
}

function requirePrepared(source: unknown): PreparedUnifoldDocument {
  const result = prepareUnifoldDocument(source);
  if (result.status !== UnifoldPreparationStatus.Valid || result.prepared === undefined) {
    throw new Error("Expected a valid prepared document.");
  }
  return result.prepared;
}

function runtimeFor(prepared: PreparedUnifoldDocument): UnifoldRuntime {
  const { document: compiled } = prepared;
  return new UnifoldRuntime({
    compositionInstances: compiled.compositionsByInstanceId,
    documentId: compiled.documentId,
    initialNodes: compiled.renderOrder.map((id) => {
      const node = compiled.nodesById[id];
      if (node === undefined) throw new Error(`Missing node: ${id}.`);
      return createNodeSnapshot(node, 0);
    })
  });
}

function failingRenderer(fail = true): DomRenderController {
  let updateCount = fail ? 0 : 1;
  return {
    dispose: noop,
    getElement: () => undefined,
    project: noop,
    restoreFocus: () => Promise.resolve(),
    update() {
      updateCount += 1;
      if (updateCount === 1) throw new Error("Injected renderer failure.");
    },
    validate: noop
  };
}

const noop = () => undefined;
