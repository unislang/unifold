import type { JsonObject, JsonValue } from "./json.js";

export enum UiDerivedRuleSchemaVersion {
  Version1 = "1.0.0"
}

export enum UiDerivedRuleOutputKind {
  ControlSetDisabled = "control-set-disabled",
  ControlSetValue = "control-set-value",
  NodePatchProperty = "node-patch-property"
}

export interface UiDerivedRuleInputDefinition extends JsonObject {
  readonly name: string;
  readonly nodeId: string;
  readonly pointer: string;
}

export interface UiControlSetDisabledRuleOutput extends JsonObject {
  readonly kind: UiDerivedRuleOutputKind.ControlSetDisabled;
  readonly nodeId: string;
}

export interface UiControlSetValueRuleOutput extends JsonObject {
  readonly kind: UiDerivedRuleOutputKind.ControlSetValue;
  readonly nodeId: string;
}

export interface UiNodePatchPropertyRuleOutput extends JsonObject {
  readonly kind: UiDerivedRuleOutputKind.NodePatchProperty;
  readonly nodeId: string;
  readonly property: string;
}

export type UiDerivedRuleOutputDefinition =
  | UiControlSetDisabledRuleOutput
  | UiControlSetValueRuleOutput
  | UiNodePatchPropertyRuleOutput;

export interface UiDerivedRuleDefinition extends JsonObject {
  readonly expression: JsonValue;
  readonly id: string;
  readonly inputs: readonly UiDerivedRuleInputDefinition[];
  readonly output: UiDerivedRuleOutputDefinition;
  readonly schemaVersion: UiDerivedRuleSchemaVersion;
  readonly version: string;
}
