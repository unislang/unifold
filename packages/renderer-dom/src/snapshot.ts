import { getCoreDescriptor } from "@unislang/unifold-catalog";
import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";
import {
  DataClassification,
  UiControlStatus,
  UiNodeKind,
  UiUpdateTrigger,
  type UiControlState,
  type UiNodeSnapshot,
  type UiValidationError
} from "@unislang/unifold-events";
import { UiNodeKind as IrNodeKind, type UnifoldIrNode } from "@unislang/unifold-ir";

const kindMap: Readonly<Record<IrNodeKind, UiNodeKind>> = {
  [IrNodeKind.Application]: UiNodeKind.Application,
  [IrNodeKind.Array]: UiNodeKind.Array,
  [IrNodeKind.Component]: UiNodeKind.Component,
  [IrNodeKind.Composition]: UiNodeKind.Composition,
  [IrNodeKind.Control]: UiNodeKind.Control,
  [IrNodeKind.Form]: UiNodeKind.Form,
  [IrNodeKind.Group]: UiNodeKind.Group,
  [IrNodeKind.Page]: UiNodeKind.Page,
  [IrNodeKind.Record]: UiNodeKind.Record,
  [IrNodeKind.Surface]: UiNodeKind.Surface
};

const controlKinds = new Set<IrNodeKind>([
  IrNodeKind.Array,
  IrNodeKind.Control,
  IrNodeKind.Form,
  IrNodeKind.Group,
  IrNodeKind.Record
]);

const objectControlKinds = new Set<IrNodeKind>([
  IrNodeKind.Form,
  IrNodeKind.Group,
  IrNodeKind.Record
]);

export function createNodeSnapshot(node: UnifoldIrNode, stateRevision: number): UiNodeSnapshot {
  const snapshot = createBaseSnapshot(node, stateRevision);
  return withControl(node, withComposition(node, withParent(node, snapshot)));
}

export function createProjectedProperties(
  snapshot: UiNodeSnapshot,
  routedErrors: readonly UiValidationError[],
  formatMessage: (error: UiValidationError) => string
): JsonObject {
  return {
    ...snapshot.properties,
    disabled: snapshot.base.disabled,
    readonly: snapshot.base.readonly,
    ...controlProperties(snapshot),
    ...validationProperties(snapshot, routedErrors, formatMessage)
  };
}

function controlProperties(snapshot: UiNodeSnapshot): JsonObject {
  const control = snapshot.control;
  return control === undefined ? {} : { required: control.required, value: control.rawValue };
}

function validationProperties(
  snapshot: UiNodeSnapshot,
  routedErrors: readonly UiValidationError[],
  formatMessage: (error: UiValidationError) => string
): JsonObject {
  if (snapshot.control === undefined) return {};
  const messages = visibleValidationMessages(snapshot, routedErrors, formatMessage);
  if (snapshot.kind === UiNodeKind.Form) return { errorMessages: messages };
  return { errorMessage: firstMessage(messages) };
}

function firstMessage(messages: readonly string[]): string {
  return messages[0] ?? "";
}

function visibleValidationMessages(
  snapshot: UiNodeSnapshot,
  routedErrors: readonly UiValidationError[],
  formatMessage: (error: UiValidationError) => string
): readonly string[] {
  const control = snapshot.control;
  if (control === undefined || !control.touched) return [];
  return [...control.errors, ...routedErrors].map(formatMessage);
}

function createBaseSnapshot(node: UnifoldIrNode, stateRevision: number): UiNodeSnapshot {
  return {
    id: node.id,
    instanceId: instanceId(node),
    kind: kindMap[node.kind],
    type: node.componentType,
    definitionVersion: definitionVersion(node),
    scopePath: node.scopePath,
    revision: stateRevision,
    base: {
      mounted: true,
      visible: true,
      interactive: true,
      disabled: readBoolean(node, "disabled"),
      readonly: readBoolean(node, "readonly"),
      busy: false,
      focused: false,
      dataClassification: DataClassification.Public
    },
    attributes: {},
    properties: snapshotProperties(node)
  };
}

function snapshotProperties(node: UnifoldIrNode): JsonObject {
  const descriptor = getCoreDescriptor(node.componentType);
  if (descriptor === undefined) return node.properties;
  const defaults = descriptor.properties.flatMap((property) => {
    const defaultValue = property.defaultValue;
    if (defaultValue === undefined || node.properties[property.name] !== undefined) return [];
    return [[property.name, cloneJson(defaultValue)] as const];
  });
  return { ...Object.fromEntries(defaults), ...node.properties };
}

function cloneJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (!isJsonObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, cloneJson(item as JsonValue)])
  );
}

function isJsonObject(value: JsonValue): value is JsonObject {
  if (value === null) return false;
  return typeof value === "object";
}

function withParent(node: UnifoldIrNode, snapshot: UiNodeSnapshot): UiNodeSnapshot {
  return node.parentId === undefined ? snapshot : { ...snapshot, parentId: node.parentId };
}

function withComposition(node: UnifoldIrNode, snapshot: UiNodeSnapshot): UiNodeSnapshot {
  return node.composition === undefined ? snapshot : { ...snapshot, composition: node.composition };
}

function withControl(node: UnifoldIrNode, snapshot: UiNodeSnapshot): UiNodeSnapshot {
  return controlKinds.has(node.kind) ? { ...snapshot, control: createControl(node) } : snapshot;
}

function instanceId(node: UnifoldIrNode): string {
  return node.composition?.instanceId ?? node.id;
}

function definitionVersion(node: UnifoldIrNode): string {
  return node.composition?.definitionVersion ?? "1.0.0";
}

function createControl(node: UnifoldIrNode): UiControlState {
  const value = readValue(node, "value", initialValue(node.kind));
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
    required: readBoolean(node, "required"),
    updateOn: readUpdateTrigger(node),
    validatorIds: readStringArray(node, "validators"),
    asyncValidatorIds: readStringArray(node, "asyncValidators"),
    validationRequestId: null
  };
}

function initialValue(kind: IrNodeKind): JsonValue {
  if (kind === IrNodeKind.Array) return [];
  if (objectControlKinds.has(kind)) return {};
  return "";
}

function readUpdateTrigger(node: UnifoldIrNode): UiUpdateTrigger {
  const value = node.properties["updateOn"];
  return Object.values(UiUpdateTrigger).includes(value as UiUpdateTrigger)
    ? (value as UiUpdateTrigger)
    : UiUpdateTrigger.Input;
}

function readStringArray(node: UnifoldIrNode, name: string): readonly string[] {
  const value = node.properties[name];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readBoolean(node: UnifoldIrNode, name: string): boolean {
  return node.properties[name] === true;
}

function readValue(node: UnifoldIrNode, name: string, fallback: JsonValue): JsonValue {
  return snapshotProperties(node)[name] ?? fallback;
}
