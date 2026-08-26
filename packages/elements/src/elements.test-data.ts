import {
  DataClassification,
  UiControlStatus,
  UiNodeKind,
  UiUpdateTrigger,
  type JsonObject,
  type JsonValue,
  type UiControlState,
  type UiNodeSnapshot
} from "@unislang/unifold-events";

/** Creates committed element snapshots for colocated component tests. */
export function controlNode(
  id: string,
  value: JsonValue,
  parentId?: string,
  type = "TextField"
): UiNodeSnapshot {
  const node: UiNodeSnapshot = {
    id,
    instanceId: `${id}-instance`,
    kind: UiNodeKind.Control,
    type,
    definitionVersion: "1.0.0",
    scopePath: controlScope(id, parentId),
    revision: 2,
    base: nodeBase(),
    attributes: {},
    properties: { name: id },
    control: controlState(value)
  };
  return parentId === undefined ? node : { ...node, parentId };
}

function controlState(value: JsonValue): UiControlState {
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

function controlScope(id: string, parentId: string | undefined): string[] {
  if (parentId === undefined) return [id];
  return [parentId, id];
}

export function componentNode(id: string, type: string): UiNodeSnapshot {
  return {
    id,
    instanceId: `${id}-instance`,
    kind: UiNodeKind.Component,
    type,
    definitionVersion: "1.0.0",
    scopePath: [id],
    revision: 2,
    base: nodeBase(),
    attributes: {},
    properties: {}
  };
}

export function compositionNode(id: string, value: JsonObject = {}): UiNodeSnapshot {
  return {
    id,
    instanceId: `${id}-instance`,
    kind: UiNodeKind.Form,
    type: "Form",
    definitionVersion: "1.0.0",
    scopePath: [id],
    revision: 2,
    base: nodeBase(),
    attributes: {},
    properties: {},
    control: {
      value,
      rawValue: value,
      initialValue: {},
      status: UiControlStatus.Valid,
      errors: [],
      pristine: false,
      dirty: true,
      touched: false,
      pending: false,
      required: false,
      updateOn: UiUpdateTrigger.Input,
      validatorIds: [],
      asyncValidatorIds: [],
      validationRequestId: null
    }
  };
}

function nodeBase() {
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
