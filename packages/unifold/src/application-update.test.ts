// @vitest-environment happy-dom
import { UiCommandType } from "@unislang/unifold-events";
import { createTrustedLayoutDefinitionRegistry } from "@unislang/unifold-compositions";
import { CoreCatalogMajor, CoreElementTag, coreCatalog } from "@unislang/unifold-catalog";
import { ElementDefinitionPolicy } from "@unislang/unifold-elements";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import { Window } from "happy-dom";
import { expect, it, vi } from "vitest";

import {
  authoredDocument,
  compositionDocument,
  compositionMigration,
  requireApplication,
  requireElement,
  requireInput,
  updateComplete
} from "./application.test-data.js";
import { mountUnifoldApplication } from "./mount.js";
import { layoutDocument } from "./compiler-layout.test-data.js";
import { UnifoldApplicationDiagnosticStage, UnifoldApplicationUpdateStatus } from "./types.js";
import {
  appliedUpdate,
  errorDiagnostic,
  identityDiagnostic,
  reconcileCommand,
  rejectedUpdate,
  reverseMigrationPlan,
  rollbackResultDiagnostic,
  unavailableDiagnostic
} from "./application-update.js";

it("builds forward and reverse structural migration commands", () => {
  const document = fixtureDocument("fixture");
  const migration = {
    nodeIdentityAliases: { next: "previous" },
    resetNodeIds: ["reset"]
  };
  expect(reconcileCommand(document, [], migration)).toMatchObject({
    nodeIdentityAliases: { next: "previous" },
    resetNodeIds: ["reset"],
    type: UiCommandType.StructureReconcile
  });
  expect(reverseMigrationPlan(migration)).toEqual({
    nodeIdentityAliases: { previous: "next" },
    resetNodeIds: []
  });
});

it("migrates dirty and focused state across an exact versioned export rename", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const application = requireApplication(
    mountUnifoldApplication(compositionDocument("1", "1", "old-field", "field"), container, {
      compositionMigrations: [compositionMigration()]
    })
  );
  const oldField = requireElement(application, "editor::old-field");
  await updateComplete(oldField);
  application.runtime.execute([
    { id: "editor::old-field", type: UiCommandType.ControlSetValue, value: "User value" }
  ]);
  const focus = vi.spyOn(HTMLInputElement.prototype, "focus");
  requireInput(oldField).focus();
  const result = application.update(compositionDocument("2", "2", "new-field", "name"));
  const newField = requireElement(application, "editor::new-field");
  await updateComplete(newField);
  expect(result.status).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(application.runtime.getSnapshot("editor::new-field")).toMatchObject({
    control: { dirty: true, value: "User value" }
  });
  await vi.waitFor(() => expect(focus.mock.instances).toContain(requireInput(newField)));
  focus.mockRestore();
  expect(() => application.runtime.getSnapshot("editor::old-field")).toThrow("Unknown node");
  application.dispose();
  container.remove();
});

it("resets unmapped composition state and rejects an unreviewed version change", () => {
  const source = compositionDocument("1", "1", "old-field", "field");
  const reset = requireApplication(
    mountUnifoldApplication(source, document.createElement("div"), {
      compositionMigrations: [compositionMigration(false)]
    })
  );
  reset.runtime.execute([
    { id: "editor::old-field", type: UiCommandType.ControlSetValue, value: "User value" }
  ]);
  expect(reset.update(compositionDocument("2", "2", "new-field", "name", "Next")).status).toBe(
    UnifoldApplicationUpdateStatus.Applied
  );
  expect(reset.runtime.getSnapshot("editor::new-field").control).toMatchObject({
    dirty: false,
    value: "Next"
  });
  reset.dispose();

  const rejected = requireApplication(
    mountUnifoldApplication(source, document.createElement("div"))
  );
  const result = rejected.update(compositionDocument("2", "2", "new-field", "name"));
  expect(result.status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(result.diagnostics[0]?.stage).toBe(UnifoldApplicationDiagnosticStage.Composition);
  expect(rejected.document.documentRevision).toBe("1");
  rejected.dispose();
});

it("creates stable coordination and result diagnostics", () => {
  expect(identityDiagnostic(fixtureDocument("one"), fixtureDocument("two"))).toMatchObject({
    code: "document-id-changed",
    stage: UnifoldApplicationDiagnosticStage.Coordination
  });
  expect(identityDiagnostic(fixtureDocument("one"), fixtureDocument("one"))).toBeUndefined();
  expect(
    errorDiagnostic(new Error("failed"), UnifoldApplicationDiagnosticStage.Runtime)
  ).toMatchObject({
    message: "failed",
    stage: UnifoldApplicationDiagnosticStage.Runtime
  });
  expect(appliedUpdate(2).status).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(rejectedUpdate(2, []).status).toBe(UnifoldApplicationUpdateStatus.Rejected);
  expect(unavailableDiagnostic().code).toBe("application-unavailable");
  expect(
    rollbackResultDiagnostic(
      new Error("rollback"),
      new Error("update"),
      UnifoldApplicationDiagnosticStage.Runtime
    ).code
  ).toBe("application-update-rollback-failed");
});

it("retains the last-known-good hierarchy after an invalid layout update", () => {
  const container = document.createElement("div");
  const application = requireApplication(mountUnifoldApplication(layoutDocument(), container));
  const name = application.renderer.getElement("name");
  const invalid = layoutDocument();
  invalid.revision = "2";
  const field = invalid.variables.fields[0];
  if (field === undefined) throw new Error("Missing layout field fixture.");
  field.type = "MissingComponent";
  const result = application.update(invalid);
  expect(result).toMatchObject({
    diagnostics: [expect.objectContaining({ path: "/variables/fields/0/type" })],
    status: UnifoldApplicationUpdateStatus.Rejected
  });
  expect(application.renderer.getElement("name")).toBe(name);
  expect(application.document.documentRevision).toBe("1");
  expect(application.authored).toMatchObject({ revision: "1" });
  application.dispose();
});

it("reuses the trusted layout registry for mounted document updates", () => {
  const source = layoutDocument();
  const registry = createTrustedLayoutDefinitionRegistry(source.layouts);
  Reflect.deleteProperty(source, "layouts");
  const container = document.createElement("div");
  const application = requireApplication(
    mountUnifoldApplication(source, container, { layoutRegistry: registry })
  );
  const next = structuredClone(source);
  next.revision = "2";
  next.variables.heading = "Updated heading";
  expect(application.update(next).status).toBe(UnifoldApplicationUpdateStatus.Applied);
  expect(application.document.documentRevision).toBe("2");
  application.dispose();
});

it("rejects a foreign definition that wins a pending-upgrade race", () => {
  const realm = new Window();
  const container = realm.document.createElement("div") as unknown as HTMLElement;
  const application = requireApplication(
    mountUnifoldApplication(tooltipDocument("1", "Shipping"), container, {
      elementDefinitionPolicy: ElementDefinitionPolicy.AllowPending
    })
  );
  realm.customElements.define(CoreElementTag.Tooltip, class extends realm.HTMLElement {});

  const result = application.update(tooltipDocument("2", "Updated shipping"));

  expect(result).toMatchObject({
    diagnostics: [{ stage: UnifoldApplicationDiagnosticStage.ElementRegistration }],
    status: UnifoldApplicationUpdateStatus.Rejected
  });
  expect(application.document.documentRevision).toBe("1");
  expect(application.runtime.revision).toBe(0);
  application.dispose();
});

it("replays a runtime projection when a pending definition becomes compatible", async () => {
  const realm = new Window();
  const container = realm.document.createElement("div") as unknown as HTMLElement;
  const application = requireApplication(
    mountUnifoldApplication(tooltipDocument("1", "Shipping"), container, {
      elementDefinitionPolicy: ElementDefinitionPolicy.AllowPending
    })
  );
  const element = projectRuntimeTooltip(application);
  const definition = compatibleTooltipDefinition(realm);
  realm.customElements.define(
    CoreElementTag.Tooltip,
    definition as unknown as typeof realm.HTMLElement
  );
  emulateUpgradeWhenNeeded(element, definition);
  await realm.customElements.whenDefined(CoreElementTag.Tooltip);
  await vi.waitFor(() => expect(element.dataset["replayedLabel"]).toBe("Runtime shipping"));

  expect(Reflect.get(element, "eventNode")).toMatchObject({
    properties: { label: "Runtime shipping" },
    revision: 1
  });
  expect(Reflect.get(element, "runtimeContext")).toMatchObject({
    documentId: "test-application",
    documentRevision: "1"
  });
  application.dispose();
});

function projectRuntimeTooltip(application: ReturnType<typeof requireApplication>): HTMLElement {
  application.runtime.execute([
    {
      id: "shipping-help",
      properties: { label: "Runtime shipping" },
      type: UiCommandType.NodePatchProperties
    }
  ]);
  return requireElement(application, "shipping-help");
}

function compatibleTooltipDefinition(realm: Window): CustomElementConstructor {
  const definition = class extends realm.HTMLElement {
    set label(value: string) {
      this.dataset["replayedLabel"] = value;
    }
  } as unknown as CustomElementConstructor;
  Object.defineProperty(definition, Symbol.for("org.unifold.element-definition"), {
    value: {
      catalogMajor: CoreCatalogMajor.Version1,
      catalogName: coreCatalog.name,
      catalogVersion: coreCatalog.version,
      tagName: CoreElementTag.Tooltip
    }
  });
  return definition;
}

function emulateUpgradeWhenNeeded(
  element: HTMLElement,
  definition: CustomElementConstructor
): void {
  if (element instanceof definition) return;
  Reflect.set(element, "eventNode", undefined);
  Reflect.set(element, "label", "constructor-default");
  Reflect.set(element, "runtimeContext", { documentId: "constructor" });
  Reflect.setPrototypeOf(element, definition.prototype);
}

function tooltipDocument(revision: string, label: string) {
  return {
    ...authoredDocument(revision),
    view: {
      $comp: "Tooltip",
      content: "Delivery estimates exclude holidays.",
      id: "shipping-help",
      label
    }
  };
}

function fixtureDocument(documentId: string): UnifoldIrDocument {
  return {
    compositionsByInstanceId: {},
    documentId,
    nodeIdentityAliases: {}
  } as UnifoldIrDocument;
}
