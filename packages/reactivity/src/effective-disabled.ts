import {
  UiControlStatus,
  type UiControlState,
  type UiNodeId,
  type UiNodeSnapshot
} from "@unislang/unifold-events";
import { castDraft, type Draft } from "immer";

import type { AggregateControlValidator, NormalizedNodeState } from "./store-types.js";

/**
 * Reconciles local disabled intent into effective logical-control state.
 * Roots may overlap; each affected node is evaluated once, parent before child.
 */
export function reconcileEffectiveDisabled(
  state: Draft<NormalizedNodeState>,
  rootIds: Iterable<UiNodeId>,
  validate?: AggregateControlValidator
): readonly UiNodeId[] {
  const candidates = affectedIds(state, rootIds);
  const changed: UiNodeId[] = [];
  orderedIds(state, candidates).forEach((id) => {
    const node = state.nodes[id];
    if (node !== undefined && reconcileNode(state, node, validate)) changed.push(id);
  });
  return changed;
}

export function ownDisabled(snapshot: UiNodeSnapshot): boolean {
  return snapshot.base.ownDisabled ?? snapshot.base.disabled;
}

function reconcileNode(
  state: Draft<NormalizedNodeState>,
  node: Draft<UiNodeSnapshot>,
  validate?: AggregateControlValidator
): boolean {
  const previous = node.base.disabled;
  const own = ownDisabled(node as unknown as UiNodeSnapshot);
  const effective = effectiveDisabled(state, node, own);
  const baseChanged = assignBase(node, own, effective);
  const control = node.control;
  if (control === undefined) return baseChanged;
  const next = reconciledControl(node, control, previous, effective, validate);
  const controlChanged = assignControl(node, control, next);
  return [baseChanged, controlChanged].some(Boolean);
}

function effectiveDisabled(
  state: Draft<NormalizedNodeState>,
  node: Draft<UiNodeSnapshot>,
  own: boolean
): boolean {
  if (own) return true;
  return inheritedDisabled(state, node);
}

function assignControl(
  node: Draft<UiNodeSnapshot>,
  current: Draft<UiControlState>,
  next: UiControlState
): boolean {
  if (sameValue(current, next)) return false;
  node.control = castDraft(next);
  return true;
}

function assignBase(node: Draft<UiNodeSnapshot>, own: boolean, effective: boolean): boolean {
  const interactive = !effective;
  const changed = [
    node.base.ownDisabled !== own,
    node.base.disabled !== effective,
    node.base.interactive !== interactive
  ].some(Boolean);
  if (!changed) return false;
  node.base.ownDisabled = own;
  node.base.disabled = effective;
  node.base.interactive = interactive;
  return true;
}

function reconciledControl(
  node: Draft<UiNodeSnapshot>,
  control: Draft<UiControlState>,
  previousDisabled: boolean,
  effectiveDisabled: boolean,
  validate?: AggregateControlValidator
): UiControlState {
  if (effectiveDisabled) return disabledControl(control);
  if (retainsEnabledControl(previousDisabled, control)) {
    return control as unknown as UiControlState;
  }
  return revalidatedControl(node, control, validate);
}

function retainsEnabledControl(previousDisabled: boolean, control: Draft<UiControlState>): boolean {
  return !previousDisabled && control.status !== UiControlStatus.Disabled;
}

function revalidatedControl(
  node: Draft<UiNodeSnapshot>,
  control: Draft<UiControlState>,
  validate?: AggregateControlValidator
): UiControlState {
  if (validate === undefined) return enabledControl(control);
  return validate(node as unknown as UiNodeSnapshot);
}

function disabledControl(control: Draft<UiControlState>): UiControlState {
  return {
    ...(control as unknown as UiControlState),
    errors: [],
    pending: false,
    status: UiControlStatus.Disabled,
    validationRequestId: null
  };
}

function enabledControl(control: Draft<UiControlState>): UiControlState {
  const errors = control.errors as unknown as UiControlState["errors"];
  return {
    ...(control as unknown as UiControlState),
    pending: false,
    status: errors.length === 0 ? UiControlStatus.Valid : UiControlStatus.Invalid,
    validationRequestId: null
  };
}

function inheritedDisabled(
  state: Draft<NormalizedNodeState>,
  node: Draft<UiNodeSnapshot>
): boolean {
  const parentId = effectiveParentId(node);
  if (parentId === undefined) return false;
  return state.nodes[parentId]?.base.disabled === true;
}

function effectiveParentId(node: Draft<UiNodeSnapshot>): UiNodeId | undefined {
  if (node.controlParentId !== undefined) return node.controlParentId;
  return node.parentId;
}

function affectedIds(
  state: Draft<NormalizedNodeState>,
  rootIds: Iterable<UiNodeId>
): ReadonlySet<UiNodeId> {
  const affected = new Set<UiNodeId>();
  const pending = [...rootIds];
  for (const id of pending) {
    if (!isAffectedCandidate(state, affected, id)) continue;
    affected.add(id);
    pending.push(...controlChildren(state, id));
  }
  return affected;
}

function isAffectedCandidate(
  state: Draft<NormalizedNodeState>,
  affected: ReadonlySet<UiNodeId>,
  id: UiNodeId
): boolean {
  return !affected.has(id) && state.nodes[id] !== undefined;
}

function controlChildren(state: Draft<NormalizedNodeState>, id: UiNodeId): readonly UiNodeId[] {
  const children = state.controlChildren[id];
  return children === undefined ? [] : children;
}

function orderedIds(
  state: Draft<NormalizedNodeState>,
  candidates: ReadonlySet<UiNodeId>
): readonly UiNodeId[] {
  const roots = [...candidates].filter((id) => isOrderedRoot(state, candidates, id));
  const ordered: UiNodeId[] = [];
  const pending = [...roots];
  for (const id of pending) {
    ordered.push(id);
    pending.push(...controlChildren(state, id).filter((child) => candidates.has(child)));
  }
  return ordered;
}

function isOrderedRoot(
  state: Draft<NormalizedNodeState>,
  candidates: ReadonlySet<UiNodeId>,
  id: UiNodeId
): boolean {
  const parentId = controlParentId(state, id);
  return parentId === undefined || !candidates.has(parentId);
}

function controlParentId(state: Draft<NormalizedNodeState>, id: UiNodeId): UiNodeId | undefined {
  const node = state.nodes[id];
  return node === undefined ? undefined : effectiveParentId(node);
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
