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
import type { UiMachineGuardRegistry, UiMachineSnapshotReader } from "./guard-registry.js";

interface UiRegisteredGuardParameters {
  readonly guardId: string;
}

export interface UiMachineActor extends UiActorRef {
  readonly definition: UiMachineDefinition;
  readonly state: JsonValue;
  start(): void;
  stop(): void;
}

export function createUiMachineActor(
  definition: UiMachineDefinition,
  registry: UiMachineCommandRegistry,
  sink: UiCausedCommandSink,
  guards?: UiMachineGuardRegistry,
  snapshot: UiMachineSnapshotReader = () => undefined
): UiMachineActor {
  requireImplementations(definition, registry, guards);
  const logic = createMachineLogic(definition, registry, sink, guards, snapshot);
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

function createMachineLogic(
  definition: UiMachineDefinition,
  registry: UiMachineCommandRegistry,
  sink: UiCausedCommandSink,
  guards: UiMachineGuardRegistry | undefined,
  snapshot: UiMachineSnapshotReader
) {
  const machineSetup = setup({
    actions: {
      [UiXStateImplementationName.EmitCommand]: createRegisteredCommandAction(registry, sink)
    },
    guards: {
      [UiXStateImplementationName.EvaluateGuard]: (
        actorArgs: { readonly event: UiXStateEvent },
        parameters: UiRegisteredGuardParameters
      ): boolean =>
        guards?.evaluate(parameters.guardId, { event: actorArgs.event.uiEvent, snapshot }) === true
    },
    types: { events: {} as UiXStateEvent }
  });
  return machineSetup.createMachine(machineConfig(definition));
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
    ...(transition.guard === undefined ? {} : { guard: guardConfig(transition.guard) }),
    target: transition.target
  };
}

function guardConfig(id: string) {
  return {
    params: { guardId: id },
    type: UiXStateImplementationName.EvaluateGuard as const
  };
}

function requireImplementations(
  definition: UiMachineDefinition,
  commands: UiMachineCommandRegistry,
  guards: UiMachineGuardRegistry | undefined
): void {
  const transitions = Object.values(definition.states).flatMap((state) =>
    Object.values(state.on ?? {})
  );
  transitions
    .flatMap(({ commands: ids }) => ids ?? [])
    .forEach((id) => {
      if (!commands.has(id)) throw new Error(`Unknown machine command: ${id}.`);
    });
  transitions
    .flatMap(({ guard }) => guard ?? [])
    .forEach((id) => {
      if (guards?.has(id) !== true) throw new Error(`Unknown machine guard: ${id}.`);
    });
}
