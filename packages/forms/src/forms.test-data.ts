import type { JsonValue } from "@unislang/unifold-contracts";
import {
  DataClassification,
  UiControlStatus,
  UiNodeKind,
  UiUpdateTrigger,
  type UiNodeSnapshot
} from "@unislang/unifold-events";

export function validationNode(
  value: JsonValue,
  options: { disabled?: boolean; required?: boolean; validatorIds?: readonly string[] } = {}
): UiNodeSnapshot {
  return {
    id: "field",
    instanceId: "field",
    kind: UiNodeKind.Control,
    type: "TextField",
    definitionVersion: "1.0.0",
    scopePath: ["field"],
    revision: 0,
    base: nodeBase(options.disabled === true),
    attributes: {},
    properties: {},
    control: controlState(value, options)
  };
}

function nodeBase(disabled: boolean) {
  return {
    mounted: true,
    visible: true,
    interactive: true,
    disabled,
    readonly: false,
    busy: false,
    focused: false,
    dataClassification: DataClassification.Public
  };
}

function controlState(
  value: JsonValue,
  options: { required?: boolean; validatorIds?: readonly string[] }
) {
  return {
    value,
    rawValue: value,
    initialValue: value,
    status: UiControlStatus.Valid,
    errors: [],
    pristine: true,
    dirty: false,
    touched: false,
    pending: false,
    required: options.required === true,
    updateOn: UiUpdateTrigger.Input,
    validatorIds: options.validatorIds ?? [],
    asyncValidatorIds: [],
    validationRequestId: null
  };
}
