import {
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiCompositionExportKind,
  UiCompositionSelectionKind,
  UiMachineSchemaVersion,
  UiSchemaVersion,
  type JsonObject,
  type UiMachineDefinition
} from "@unislang/unifold-contracts";
import { coreCatalog } from "@unislang/unifold-catalog";
import { UiCommandType, UiEventType } from "@unislang/unifold-events";
import { createNodeSnapshot, type DomRenderController } from "@unislang/unifold-renderer-dom";
import { UnifoldRuntime } from "@unislang/unifold-runtime";
import { createMachineCommandRegistry } from "@unislang/unifold-xstate";

import { prepareUnifoldDocument } from "./compiler.js";
import {
  UiCompositionUnmappedMigration,
  type UiCompositionVersionMigration
} from "./composition-migrations.js";
import {
  UnifoldApplicationMountStatus,
  UnifoldPreparationStatus,
  type MountUnifoldApplicationResult,
  type PreparedUnifoldDocument,
  type UnifoldApplicationPort
} from "./types.js";

export function authoredDocument(
  revision = "1",
  options: { readonly button?: boolean; readonly label?: string; readonly value?: string } = {}
): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: "unifold-core", version: "1.0.0" },
    compositions: [],
    id: "test-application",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision,
    schemaVersion: UiSchemaVersion.Version1,
    view: form(options)
  };
}

export function workflowDefinition(): UiMachineDefinition {
  return {
    id: "profile-workflow",
    initial: "editing",
    ownerId: "form",
    schemaVersion: UiMachineSchemaVersion.Version1,
    states: {
      editing: {
        on: {
          [UiEventType.FormSubmitted]: { commands: ["show-saved"], target: "saved" }
        }
      },
      saved: {}
    },
    version: "1.0.0"
  };
}

export function workflowCommandRegistry() {
  const registry = createMachineCommandRegistry();
  registry.register("show-saved", () => ({
    id: "name",
    properties: { label: "Saved name" },
    type: UiCommandType.NodePatchProperties
  }));
  return registry;
}

export function withoutButton() {
  const components = { ...coreCatalog.components };
  Reflect.deleteProperty(components, "Button");
  return { ...coreCatalog, components };
}

export function machineDocument() {
  return { ...authoredDocument(), machines: [workflowDefinition()] };
}

export function requirePrepared(source: unknown): PreparedUnifoldDocument {
  const result = prepareUnifoldDocument(source);
  if (result.status !== UnifoldPreparationStatus.Valid || result.prepared === undefined) {
    throw new Error("Expected a valid prepared document.");
  }
  return result.prepared;
}

export function runtimeFor(prepared: PreparedUnifoldDocument): UnifoldRuntime {
  const { document } = prepared;
  return new UnifoldRuntime({
    compositionInstances: document.compositionsByInstanceId,
    documentId: document.documentId,
    initialNodes: document.renderOrder.map((id) => {
      const node = document.nodesById[id];
      if (node === undefined) throw new Error(`Missing node: ${id}.`);
      return createNodeSnapshot(node, 0);
    })
  });
}

export function failingRenderer(fail = true): DomRenderController {
  return rendererWithFailures(fail ? 1 : 0);
}

export function failingCompensationRenderer(): DomRenderController {
  return rendererWithFailures(2);
}

function rendererWithFailures(failures: number): DomRenderController {
  let updateCount = 0;
  return {
    dispose: noop,
    getElement: () => undefined,
    project: noop,
    restoreFocus: () => Promise.resolve(),
    update() {
      updateCount += 1;
      if (updateCount <= failures) throw new Error("Injected renderer failure.");
    },
    validate: noop
  };
}

const noop = () => undefined;

export function requireApplication(result: MountUnifoldApplicationResult): UnifoldApplicationPort {
  if (result.status !== UnifoldApplicationMountStatus.Mounted) {
    throw new Error(`Mount rejected: ${JSON.stringify(result.diagnostics)}`);
  }
  return result.application;
}

export function requireElement(application: UnifoldApplicationPort, id: string): HTMLElement {
  const element = application.renderer.getElement(id);
  if (element === undefined) throw new Error(`Rendered element is missing: ${id}.`);
  return element;
}

export function requireInput(element: HTMLElement): HTMLInputElement {
  const input = element.shadowRoot?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Rendered input is missing.");
  return input;
}

export function requireShadowElement<T extends Element>(host: HTMLElement, selector: string): T {
  const root = host.shadowRoot;
  if (root === null) throw new Error("Rendered shadow root is missing.");
  const element = root.querySelector<T>(selector);
  if (element === null) throw new Error(`Rendered ${selector} is missing.`);
  return element;
}

export async function updateComplete(element: HTMLElement): Promise<void> {
  await (element as HTMLElement & { readonly updateComplete: Promise<boolean> }).updateComplete;
}

export function compositionDocument(
  revision: string,
  version: string,
  fieldId: string,
  exportName: string,
  value = "Default"
): JsonObject {
  return {
    ...authoredDocument(revision),
    compositions: [compositionDefinition(version, fieldId, exportName, value)],
    view: {
      $children: [{ $compose: "Editor", $version: version, id: "editor" }],
      $comp: "Form",
      id: "application"
    }
  };
}

export function compositionMigration(preserve = true): UiCompositionVersionMigration {
  return {
    from: { name: "Editor", version: "1" },
    preserve: preserve ? [{ source: "field", target: "name" }] : [],
    to: { name: "Editor", version: "2" },
    unmapped: UiCompositionUnmappedMigration.Reset
  };
}

function compositionDefinition(
  version: string,
  fieldId: string,
  exportName: string,
  value: string
): JsonObject {
  return {
    contractVersion: "1.0.0",
    exports: {
      [exportName]: {
        kind: UiCompositionExportKind.Selection,
        localId: fieldId,
        selection: UiCompositionSelectionKind.ControlValue
      }
    },
    name: "Editor",
    parameters: {},
    slots: [],
    template: {
      $children: [{ $comp: "TextField", id: fieldId, label: "Name", name: "name", value }],
      $comp: "Composition",
      id: "root"
    },
    version
  };
}

function form(options: {
  readonly button?: boolean;
  readonly label?: string;
  readonly value?: string;
}) {
  const children: JsonObject[] = [textField(options)];
  if (options.button === true) {
    children.push({ $comp: "Button", id: "details", label: "Details" });
  }
  return { $children: children, $comp: "Form", id: "form", label: "Profile" };
}

function textField(options: { readonly label?: string; readonly value?: string }): JsonObject {
  return {
    $comp: "TextField",
    id: "name",
    label: options.label ?? "Name",
    name: "name",
    value: options.value ?? ""
  };
}
