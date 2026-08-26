import type {
  JsonValue,
  UiMachineDefinition,
  UiMachineStateDefinition,
  UiMachineTransitionDefinition
} from "@unislang/unifold-contracts";
import { createActor, setup } from "xstate";

import type { UiActorRef, UiXStateEvent } from "./actor-router.js";
import {
  UiXStateImplementationName,
  createRegisteredCommandAction,
  type UiCausedCommandSink
} from "./command-action.js";
import type { UiMachineCommandRegistry } from "./command-registry.js";

export interface UiMachineActor extends UiActorRef {
  readonly definition: UiMachineDefinition;
  readonly state: JsonValue;
  start(): void;
  stop(): void;
}

export function createUiMachineActor(
  definition: UiMachineDefinition,
  registry: UiMachineCommandRegistry,
  sink: UiCausedCommandSink
): UiMachineActor {
  requireCommands(definition, registry);
  const machineSetup = setup({
    actions: {
      [UiXStateImplementationName.EmitCommand]: createRegisteredCommandAction(registry, sink)
    },
    types: { events: {} as UiXStateEvent }
  });
  const logic = machineSetup.createMachine(machineConfig(definition));
  const actor = createActor(logic);
  return {
    definition,
    get state() {
      return actor.getSnapshot().value as JsonValue;
    },
    send: (event) => actor.send(event),
    start: () => actor.start(),
    stop: () => actor.stop()
  };
}

function machineConfig(definition: UiMachineDefinition) {
  return {
    id: definition.id,
    initial: definition.initial,
    states: Object.fromEntries(
      Object.entries(definition.states).map(([id, state]) => [id, stateConfig(state)])
    )
  };
}

function stateConfig(state: UiMachineStateDefinition) {
  if (state.on === undefined) return {};
  return {
    on: Object.fromEntries(
      Object.entries(state.on).map(([event, transition]) => [event, transitionConfig(transition)])
    )
  };
}

function transitionConfig(transition: UiMachineTransitionDefinition) {
  return {
    actions: (transition.commands ?? []).map((commandId) => ({
      params: { commandId },
      type: UiXStateImplementationName.EmitCommand as const
    })),
    target: transition.target
  };
}

function requireCommands(
  definition: UiMachineDefinition,
  registry: UiMachineCommandRegistry
): void {
  machineCommandIds(definition).forEach((id) => {
    if (!registry.has(id)) throw new Error(`Unknown machine command: ${id}.`);
  });
}

function machineCommandIds(definition: UiMachineDefinition): readonly string[] {
  return Object.values(definition.states).flatMap((state) =>
    Object.values(state.on ?? {}).flatMap(({ commands }) => commands ?? [])
  );
}
