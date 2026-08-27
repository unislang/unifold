import type { JsonObject } from "./json.js";

export enum UiUpdateTrigger {
  Blur = "blur",
  Input = "input",
  Submit = "submit"
}

/** Versioned, JSON-safe control topology contract. */
export enum UiControlTopologyVersion {
  Version1 = "1.0.0"
}

/** Control semantics are declared independently from visual component nesting. */
export enum UiControlNodeKind {
  Array = "array",
  Control = "control",
  Form = "form",
  Group = "group",
  Record = "record"
}

export interface UiControlNodeDefinition extends JsonObject {
  readonly id: string;
  readonly key?: string;
  readonly kind: UiControlNodeKind;
  readonly parentId?: string;
}

export interface UiControlTopologyDefinition extends JsonObject {
  readonly contractVersion: UiControlTopologyVersion;
  readonly nodes: readonly UiControlNodeDefinition[];
}
