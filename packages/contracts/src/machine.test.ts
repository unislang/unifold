import { expect, it } from "vitest";

import { UiMachineSchemaVersion, type UiMachineDefinition } from "./index.js";

it("defines a versioned data-only workflow contract", () => {
  const definition: UiMachineDefinition = {
    id: "profile-workflow",
    initial: "editing",
    ownerId: "profile",
    schemaVersion: UiMachineSchemaVersion.Version1,
    states: {
      editing: { on: { submit: { commands: ["show-saved"], target: "saved" } } },
      saved: {}
    },
    version: "1.0.0"
  };

  expect(definition.states[definition.initial]).toBeDefined();
});
