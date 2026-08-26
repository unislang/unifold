import {
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiMachineSchemaVersion,
  UiSchemaVersion,
  type JsonObject,
  type UiMachineDefinition
} from "@unislang/unifold-contracts";
import { UiCommandType, UiEventType } from "@unislang/unifold-events";
import { createMachineCommandRegistry } from "@unislang/unifold-xstate";

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
