import {
  UiDerivedRuleOutputKind,
  type JsonValue,
  type UiDerivedRuleOutputDefinition
} from "@unislang/unifold-contracts";
import { UiCommandType, type UiCommand } from "@unislang/unifold-events";

export function createDerivedRuleCommand(
  output: UiDerivedRuleOutputDefinition,
  value: JsonValue
): UiCommand {
  if (output.kind === UiDerivedRuleOutputKind.ControlSetDisabled) {
    return disabledCommand(output.nodeId, value);
  }
  if (output.kind === UiDerivedRuleOutputKind.ControlSetValue) {
    return { id: output.nodeId, type: UiCommandType.ControlSetValue, value };
  }
  return {
    id: output.nodeId,
    properties: { [output.property]: value },
    type: UiCommandType.NodePatchProperties
  };
}

function disabledCommand(id: string, value: JsonValue): UiCommand {
  if (typeof value !== "boolean")
    throw new Error("control-set-disabled rules must return a boolean.");
  return { disabled: value, id, type: UiCommandType.ControlSetDisabled };
}
