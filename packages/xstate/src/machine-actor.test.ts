import { UiMachineSchemaVersion } from "@unislang/unifold-contracts";
import { UiCommandType, UiEventType } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { createMachineCommandRegistry } from "./command-registry.js";
import { exampleEvent } from "./effect-actor.test-data.js";
import { createMachineGuardRegistry } from "./guard-registry.js";
import { createUiMachineActor } from "./machine-actor.js";

it("routes a canonical event through XState and emits a registered typed command", () => {
  const registry = createMachineCommandRegistry();
  registry.register("show-saved", () => ({
    id: "save",
    properties: { label: "Saved" },
    type: UiCommandType.NodePatchProperties
  }));
  const sink = vi.fn();
  const actor = createUiMachineActor(
    machineDefinition(),
    registry,
    sink,
    createMachineGuardRegistry()
  );
  const event = exampleEvent(UiEventType.FormSubmitted);
  actor.start();

  actor.send({ type: event.type, uiEvent: event });

  expect(actor.state).toBe("saved");
  expect(sink).toHaveBeenCalledWith(expect.objectContaining({ id: "save" }), event);
  actor.stop();
});

it("rejects an unregistered portable command reference", () => {
  expect(() =>
    createUiMachineActor(
      machineDefinition(),
      createMachineCommandRegistry(),
      vi.fn(),
      createMachineGuardRegistry()
    )
  ).toThrow("Unknown machine command");
});

it("evaluates a named guard against the current normalized snapshot", () => {
  const commands = createMachineCommandRegistry();
  commands.register("show-saved", () => ({
    id: "save",
    properties: { label: "Saved" },
    type: UiCommandType.NodePatchProperties
  }));
  const guards = createMachineGuardRegistry();
  guards.register("is-ready", ({ snapshot }) => snapshot("field")?.properties["ready"] === true);
  let ready = false;
  const actor = createUiMachineActor(guardedDefinition(), commands, vi.fn(), guards, () => {
    return { properties: { ready } } as never;
  });
  const event = exampleEvent(UiEventType.FormSubmitted);
  actor.start();

  actor.send({ type: event.type, uiEvent: event });
  expect(actor.state).toBe("editing");
  ready = true;
  actor.send({ type: event.type, uiEvent: event });
  expect(actor.state).toBe("saved");
  actor.stop();
});

it("rejects an unregistered portable guard reference", () => {
  expect(() =>
    createUiMachineActor(
      guardedDefinition(),
      registeredCommands(),
      vi.fn(),
      createMachineGuardRegistry()
    )
  ).toThrow("Unknown machine guard");
});

function machineDefinition() {
  return {
    id: "profile-workflow",
    initial: "editing",
    ownerId: "profile",
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
  } as const;
}

function guardedDefinition() {
  const definition = machineDefinition();
  return {
    ...definition,
    states: {
      ...definition.states,
      editing: {
        on: {
          [UiEventType.FormSubmitted]: {
            commands: ["show-saved"],
            guard: "is-ready",
            target: "saved"
          }
        }
      }
    }
  } as const;
}

function registeredCommands() {
  const registry = createMachineCommandRegistry();
  registry.register("show-saved", () => ({
    id: "save",
    properties: { label: "Saved" },
    type: UiCommandType.NodePatchProperties
  }));
  return registry;
}
