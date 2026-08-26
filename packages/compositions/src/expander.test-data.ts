import {
  UiCompositionExportKind,
  UiCompositionSelectionKind,
  type JsonObject
} from "@unislang/unifold-contracts";

import {
  CompositionContractVersion,
  CompositionParameterType,
  type ComposedUiDocument,
  type CompositionDefinition,
  type CompositionInstance
} from "./index.js";

export function profileDefinition(
  overrides: Partial<CompositionDefinition> = {}
): CompositionDefinition {
  return {
    contractVersion: CompositionContractVersion.Version1,
    exports: {
      field: {
        kind: UiCompositionExportKind.Selection,
        localId: "name",
        selection: UiCompositionSelectionKind.ControlValue
      },
      root: {
        kind: UiCompositionExportKind.Selection,
        localId: "root",
        selection: UiCompositionSelectionKind.Snapshot
      }
    },
    name: "ProfileEditor",
    parameters: {
      label: { required: true, type: CompositionParameterType.String }
    },
    slots: [{ multiple: false, name: "actions", required: true }],
    template: profileTemplate(),
    version: "1.0.0",
    ...overrides
  };
}

export function profileInstance(overrides: Partial<CompositionInstance> = {}): CompositionInstance {
  return {
    $compose: "ProfileEditor",
    $version: "1.0.0",
    id: "profile-editor",
    parameters: { label: "Your name" },
    slots: { actions: [{ $comp: "Button", id: "submit", label: "Save" }] },
    ...overrides
  };
}

export function composedDocument(
  definitions: readonly CompositionDefinition[] = [profileDefinition()],
  view: JsonObject = applicationView(profileInstance())
): ComposedUiDocument {
  return {
    compositions: definitions,
    id: "fixture",
    revision: "1",
    view
  };
}

export function applicationView(child: JsonObject): JsonObject {
  return { $children: [child], $comp: "Application", id: "app" };
}

function profileTemplate(): JsonObject {
  return {
    $children: [
      {
        $comp: "TextField",
        id: "name",
        label: { $parameter: "label" }
      },
      { $slot: "actions" }
    ],
    $comp: "Composition",
    id: "root"
  };
}
