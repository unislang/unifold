import type { JsonObject } from "./json.js";

export enum UiMachineSchemaVersion {
  Version1 = "1.0.0"
}

export interface UiMachineTransitionDefinition extends JsonObject {
  readonly commands?: readonly string[];
  readonly target: string;
}

export interface UiMachineStateDefinition extends JsonObject {
  readonly on?: Readonly<Record<string, UiMachineTransitionDefinition>>;
}

export interface UiMachineDefinition extends JsonObject {
  readonly id: string;
  readonly initial: string;
  readonly ownerId: string;
  readonly schemaVersion: UiMachineSchemaVersion;
  readonly states: Readonly<Record<string, UiMachineStateDefinition>>;
  readonly version: string;
}
