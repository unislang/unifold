import {
  UiCompositionUnmappedMigration,
  createMachineCommandRegistry,
  type UiCompositionVersionMigration
} from "@unislang/unifold";
import { UiCommandType } from "@unislang/unifold-events";

export function referenceCompositionMigrations(): readonly UiCompositionVersionMigration[] {
  return [compositionMigration("2.0.0", true), compositionMigration("3.0.0", false)];
}

function compositionMigration(version: string, preserve: boolean): UiCompositionVersionMigration {
  return {
    from: { name: "profile/ProfileEditor", version: "1.0.0" },
    preserve: preserve ? [{ source: "name", target: "fullName" }] : [],
    to: { name: "profile/ProfileEditor", version },
    unmapped: UiCompositionUnmappedMigration.Reset
  };
}

export function referenceMachineCommands() {
  const registry = createMachineCommandRegistry();
  registry.register("show-submitted", () => submitLabelCommand("Submitted"));
  registry.register("show-editing", () => submitLabelCommand("Create greeting"));
  registry.register("show-layout-details", () => ({
    id: "layout-status",
    properties: { content: "Details open" },
    type: UiCommandType.NodePatchProperties
  }));
  return registry;
}

function submitLabelCommand(label: string) {
  return {
    id: "profile-editor::slot:actions::submit",
    properties: { label },
    type: UiCommandType.NodePatchProperties
  } as const;
}
