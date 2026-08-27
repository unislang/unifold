// @vitest-environment happy-dom
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
import { Window } from "happy-dom";
import { expect, it, vi } from "vitest";

import { UnifoldApplication } from "./application.js";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationMountStatus,
  UnifoldApplicationUpdateStatus,
  createMemoryStoreAdapter,
  mountUnifoldApplication
} from "./index.js";
import { prepareApplicationStores } from "./store-adapters.js";
import {
  authoredDocument,
  failingCompensationRenderer,
  failingRenderer,
  machineDocument,
  requireApplication,
  requireElement,
  requireInput,
  requirePrepared,
  requireShadowElement,
  runtimeFor,
  updateComplete,
  withoutButton,
  workflowCommandRegistry,
  workflowGuardRegistry
} from "./application.test-data.js";
import { eventBoundMachineDocument } from "./application-event-binding.test-data.js";
import { dataGridStoreDocument } from "./data-grid-store.test-data.js";
import { defineUnifoldDataGrid } from "./data-grid.js";

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
  defineUnifoldDataGrid(customElements);
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

it("quarantines the application when renderer rollback cannot complete", () => {
  const prepared = requirePrepared(authoredDocument());
  const runtime = runtimeFor(prepared);
  const application = new UnifoldApplication(
    prepared,
    document.createElement("div"),
    runtime,
    failingCompensationRenderer(),
    prepareApplicationStores(prepared.document),
    {}
  );
  const result = application.update(authoredDocument("2", { label: "Full name" }));
  expect(result).toMatchObject({
    diagnostics: [
      {
        code: "application-update-rollback-failed",
        stage: UnifoldApplicationDiagnosticStage.Coordination
      }
    ],
    status: UnifoldApplicationUpdateStatus.Rejected
  });
  expect(application.document.documentRevision).toBe("1");
  expect(runtime.getSnapshot("name").properties).toMatchObject({ label: "Name" });
  expect(application.update(authoredDocument("3")).diagnostics[0]?.code).toBe(
    "application-unavailable"
  );
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

it("routes public mount guards through current normalized state", () => {
  const application = requireApplication(
    mountUnifoldApplication(machineDocument("has-name"), document.createElement("div"), {
      machineCommands: workflowCommandRegistry(),
      machineGuards: workflowGuardRegistry()
    })
  );

  application.runtime.execute([{ id: "form", type: UiCommandType.FormSubmit }]);
  expect(application.machineState("profile-workflow")).toBe("editing");
  application.runtime.execute([
    { id: "name", type: UiCommandType.ControlSetValue, value: "Ada" },
    { id: "form", type: UiCommandType.FormSubmit }
  ]);
  expect(application.machineState("profile-workflow")).toBe("saved");
  application.dispose();
});

it("routes a child component signal to its declarative workflow event", async () => {
  const container = document.createElement("main");
  document.body.append(container);
  const application = requireApplication(
    mountUnifoldApplication(eventBoundMachineDocument(), container)
  );
  const button = requireElement(application, "details");
  await updateComplete(button);

  requireShadowElement<HTMLButtonElement>(button, "button").click();

  expect(application.machineState("details-workflow")).toBe("open");
  application.dispose();
  container.remove();
});

it("rejects unknown machine commands and guards before mounting", () => {
  const unknownCommand = mountUnifoldApplication(machineDocument(), document.createElement("div"));
  const unknownGuard = mountUnifoldApplication(
    machineDocument("missing"),
    document.createElement("div"),
    { machineCommands: workflowCommandRegistry() }
  );

  expect([unknownCommand, unknownGuard].map(({ status }) => status)).toEqual([
    UnifoldApplicationMountStatus.Rejected,
    UnifoldApplicationMountStatus.Rejected
  ]);
  expect([unknownCommand, unknownGuard].map(({ diagnostics }) => diagnostics[0]?.stage)).toEqual([
    UnifoldApplicationDiagnosticStage.Workflow,
    UnifoldApplicationDiagnosticStage.Workflow
  ]);
});

it("retains the last-known-good workflow after an invalid machine update", () => {
  const application = requireApplication(
    mountUnifoldApplication(authoredDocument(), document.createElement("div"), {
      machineCommands: workflowCommandRegistry()
    })
  );

  const result = application.update(machineDocument("missing"));

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
