import {
  UiControlStatus,
  type UiNodeId,
  UiNodeKind,
  UiUpdateTrigger,
  type UiControlState,
  type UiNodeSnapshot,
  type JsonObject,
  type JsonValue
} from "@unislang/unifold-events";
import { castDraft, type Draft } from "immer";

import type { AggregateControlValidator, NormalizedNodeState } from "./store-types.js";

interface AggregateChild {
  readonly control: UiControlState;
  readonly disabled: boolean;
  readonly id: string;
  readonly key: string;
}

interface StatusRule {
  readonly matches: (node: Draft<UiNodeSnapshot>, children: readonly AggregateChild[]) => boolean;
  readonly status: UiControlStatus;
}

const aggregateKinds = new Set<UiNodeKind>([
  UiNodeKind.Array,
  UiNodeKind.Form,
  UiNodeKind.Group,
  UiNodeKind.Record
]);

export function recomputeAggregateControls(
  state: Draft<NormalizedNodeState>,
  validate?: AggregateControlValidator,
  changedIds?: ReadonlySet<UiNodeId>
): readonly UiNodeId[] {
  const nodes = affectedNodes(state, changedIds).sort(deepestFirst);
  nodes.forEach((node) => recomputeNode(state, node, validate));
  return nodes.filter((node) => aggregateKinds.has(node.kind)).map(({ id }) => id);
}

function affectedNodes(
  state: Draft<NormalizedNodeState>,
  changedIds?: ReadonlySet<UiNodeId>
): Draft<UiNodeSnapshot>[] {
  if (changedIds === undefined) return Object.values(state.nodes);
  const ids = affectedNodeIds(state, changedIds);
  return [...ids].flatMap((id) => optionalNode(state.nodes[id]));
}

function affectedNodeIds(
  state: Draft<NormalizedNodeState>,
  changedIds: ReadonlySet<UiNodeId>
): ReadonlySet<UiNodeId> {
  const affected = new Set<UiNodeId>();
  changedIds.forEach((id) => addAncestors(state, id, affected));
  return affected;
}

function addAncestors(
  state: Draft<NormalizedNodeState>,
  id: UiNodeId,
  affected: Set<UiNodeId>
): void {
  let current = state.nodes[id];
  while (current !== undefined) {
    if (affected.has(current.id)) return;
    affected.add(current.id);
    current = parentNode(state, current);
  }
}

function parentNode(
  state: Draft<NormalizedNodeState>,
  node: Draft<UiNodeSnapshot>
): Draft<UiNodeSnapshot> | undefined {
  if (node.parentId === undefined) return undefined;
  return state.nodes[node.parentId];
}

function optionalNode(node: Draft<UiNodeSnapshot> | undefined): Draft<UiNodeSnapshot>[] {
  return node === undefined ? [] : [node];
}

function recomputeNode(
  state: Draft<NormalizedNodeState>,
  node: Draft<UiNodeSnapshot>,
  validate?: AggregateControlValidator
): void {
  if (!aggregateKinds.has(node.kind)) return;
  const children = readControlChildren(state, node.id);
  const control = validatedAggregate(node, aggregateControl(node, children), validate);
  if (JSON.stringify(node.control) === JSON.stringify(control)) return;
  node.control = castDraft(control);
}

function validatedAggregate(
  node: Draft<UiNodeSnapshot>,
  control: UiControlState,
  validate?: AggregateControlValidator
): UiControlState {
  if (!shouldValidate(control, validate)) return control;
  const validated = validate({ ...(node as unknown as UiNodeSnapshot), control });
  const errors = [...control.errors, ...validated.errors];
  const pending = isPending(control, validated);
  return { ...validated, errors, pending, status: combinedStatus(errors.length, pending) };
}

function shouldValidate(
  control: UiControlState,
  validate: AggregateControlValidator | undefined
): validate is AggregateControlValidator {
  return validate !== undefined && control.status !== UiControlStatus.Disabled;
}

function isPending(control: UiControlState, validated: UiControlState): boolean {
  return control.pending || validated.pending;
}

function combinedStatus(errorCount: number, pending: boolean): UiControlStatus {
  if (pending) return UiControlStatus.Pending;
  return errorCount === 0 ? UiControlStatus.Valid : UiControlStatus.Invalid;
}

function readControlChildren(state: Draft<NormalizedNodeState>, id: string): AggregateChild[] {
  const nodes = state.nodes as unknown as Readonly<Record<string, UiNodeSnapshot>>;
  return (state.children[id] ?? []).flatMap((childId) => toAggregateChild(nodes[childId]));
}

function toAggregateChild(child: UiNodeSnapshot | undefined): AggregateChild[] {
  if (child?.control === undefined) return [];
  return [
    { control: child.control, disabled: child.base.disabled, id: child.id, key: controlKey(child) }
  ];
}

function aggregateControl(
  node: Draft<UiNodeSnapshot>,
  children: readonly AggregateChild[]
): UiControlState {
  return {
    value: aggregateValue(node.kind, children, false, ({ control }) => control.value),
    rawValue: aggregateValue(node.kind, children, true, ({ control }) => control.rawValue),
    initialValue: aggregateInitialValue(node.kind, children),
    status: aggregateStatus(node, children),
    errors: activeChildren(children).flatMap(({ control }) => control.errors),
    pristine: children.every(({ control }) => control.pristine),
    dirty: children.some(({ control }) => control.dirty),
    touched: children.some(({ control }) => control.touched),
    pending: children.some(({ control }) => control.pending),
    required: aggregateRequired(node.control),
    updateOn: aggregateUpdateOn(node.control),
    validatorIds: aggregateValidatorIds(node.control),
    asyncValidatorIds: aggregateAsyncValidatorIds(node.control),
    validationRequestId: aggregateValidationRequestId(node.control)
  };
}

function aggregateValue(
  kind: UiNodeKind,
  children: readonly AggregateChild[],
  includeDisabled: boolean,
  read: (child: AggregateChild) => JsonValue
): JsonValue {
  const selected = includeDisabled ? children : children.filter(({ disabled }) => !disabled);
  if (kind === UiNodeKind.Array) return selected.map(read);
  return objectValue(selected, read);
}

function aggregateInitialValue(kind: UiNodeKind, children: readonly AggregateChild[]): JsonValue {
  if (kind === UiNodeKind.Array) return children.map(({ control }) => control.initialValue);
  return objectValue(children, ({ control }) => control.initialValue);
}

function objectValue(
  children: readonly AggregateChild[],
  read: (child: AggregateChild) => JsonValue
): JsonObject {
  return Object.fromEntries(children.map((child) => [child.key, read(child)]));
}

function aggregateStatus(
  node: Draft<UiNodeSnapshot>,
  children: readonly AggregateChild[]
): UiControlStatus {
  return statusRules.find((rule) => rule.matches(node, children))?.status ?? UiControlStatus.Valid;
}

const statusRules: readonly StatusRule[] = [
  {
    matches: (node, children) => node.base.disabled || allDisabled(children),
    status: UiControlStatus.Disabled
  },
  {
    matches: (_node, children) => activeChildren(children).some(({ control }) => control.pending),
    status: UiControlStatus.Pending
  },
  {
    matches: (_node, children) =>
      activeChildren(children).some(({ control }) => control.status === UiControlStatus.Invalid),
    status: UiControlStatus.Invalid
  }
];

function aggregateRequired(control: Draft<UiControlState> | undefined): boolean {
  return control === undefined ? false : control.required;
}

function aggregateUpdateOn(control: Draft<UiControlState> | undefined): UiUpdateTrigger {
  return control === undefined ? UiUpdateTrigger.Input : control.updateOn;
}

function aggregateValidatorIds(control: Draft<UiControlState> | undefined): readonly string[] {
  return control === undefined ? [] : control.validatorIds;
}

function aggregateAsyncValidatorIds(control: Draft<UiControlState> | undefined): readonly string[] {
  return control === undefined ? [] : control.asyncValidatorIds;
}

function aggregateValidationRequestId(control: Draft<UiControlState> | undefined): string | null {
  return control === undefined ? null : control.validationRequestId;
}

function allDisabled(children: readonly AggregateChild[]): boolean {
  return children.length > 0 && children.every(({ disabled }) => disabled);
}

function activeChildren(children: readonly AggregateChild[]): readonly AggregateChild[] {
  return children.filter(({ disabled }) => !disabled);
}

function controlKey(node: UiNodeSnapshot): string {
  const name = node.properties["name"];
  return typeof name === "string" && name.length > 0 ? name : node.id;
}

function deepestFirst(left: Draft<UiNodeSnapshot>, right: Draft<UiNodeSnapshot>): number {
  return right.scopePath.length - left.scopePath.length;
}
