import {
  DataClassification,
  UiControlStatus,
  UiNodeKind,
  UiUpdateTrigger,
  type UiControlState,
  type UiNodeBaseState,
  type UiNodeSnapshot
} from "@unislang/unifold-events";

/** Creates normalized nodes shared by colocated reactivity tests. */
export function controlNode(id: string, value: string, parentId?: string): UiNodeSnapshot {
  return {
    id,
    instanceId: id,
    kind: UiNodeKind.Control,
    type: "TextField",
    definitionVersion: "1.0.0",
    ...(parentId ? { parentId } : {}),
    scopePath: parentId ? [parentId, id] : [id],
    revision: 0,
    base: nodeBase(),
    attributes: {},
    properties: {},
    control: controlState(value)
  };
}

function nodeBase(): UiNodeBaseState {
  return {
    mounted: true,
    visible: true,
    interactive: true,
    disabled: false,
    readonly: false,
    busy: false,
    focused: false,
    dataClassification: DataClassification.Public
  };
}

function controlState(value: string): UiControlState {
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
    required: false,
    updateOn: UiUpdateTrigger.Input,
    validatorIds: [],
    asyncValidatorIds: [],
    validationRequestId: null
  };
}
