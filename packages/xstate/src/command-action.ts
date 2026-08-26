import type { UiCommand, UiEvent } from "@unislang/unifold-events";

import type { UiXStateEvent } from "./actor-router.js";
import type { UiMachineCommandRegistry } from "./command-registry.js";

export enum UiXStateImplementationName {
  EmitCommand = "unifold.emitCommand"
}

export interface UiCommandActionParameters {
  readonly command: UiCommand;
}

export type UiCommandSink = (command: UiCommand) => void;
export type UiCausedCommandSink = (command: UiCommand, cause: UiEvent) => void;

export interface UiRegisteredCommandActionParameters {
  readonly commandId: string;
}

export function createCommandAction(sink: UiCommandSink) {
  return (_actorArgs: unknown, parameters: UiCommandActionParameters): void => {
    sink(parameters.command);
  };
}

export function createRegisteredCommandAction(
  registry: UiMachineCommandRegistry,
  sink: UiCausedCommandSink
) {
  return (
    actorArgs: { readonly event: UiXStateEvent },
    parameters: UiRegisteredCommandActionParameters
  ): void => {
    const cause = actorArgs.event.uiEvent;
    sink(registry.create(parameters.commandId, cause), cause);
  };
}
