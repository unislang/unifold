import type { JsonValue } from "@unislang/unifold-contracts";
import {
  UiCommandType,
  type UiCommand,
  type UiControlState,
  type UiNodeId,
  type UiNodeSnapshot,
  type UiTransactionRecord
} from "@unislang/unifold-events";
import {
  createSelector,
  type UiEventFabric,
  type UiNodeStore,
  type UiSelection
} from "@unislang/unifold-reactivity";
import { concat, of, type Observable } from "rxjs";

import type { UiControlHandle } from "./types.js";

type Execute = (commands: readonly UiCommand[]) => UiTransactionRecord;

interface ControlSelections<TValue extends JsonValue> {
  readonly errors: UiSelection<readonly import("@unislang/unifold-events").UiValidationError[]>;
  readonly rawValue: UiSelection<TValue>;
  readonly status: UiSelection<import("@unislang/unifold-events").UiControlStatus>;
  readonly value: UiSelection<TValue>;
}

export function createControlHandle<TValue extends JsonValue>(
  id: UiNodeId,
  store: UiNodeStore,
  fabric: UiEventFabric,
  execute: Execute
): UiControlHandle<TValue> {
  requireControl(store.getSnapshot(id));
  const selections = createControlSelections<TValue>(store, id);
  return mergeHandle<UiControlHandle<TValue>>(
    createNodeFacts(id, store, fabric),
    createControlFacts(selections),
    createControlCommands(id, execute),
    { dispose: () => disposeSelections(selections) }
  );
}

function mergeHandle<T>(...parts: readonly object[]): T {
  const target = {};
  parts.forEach((part) => Object.defineProperties(target, Object.getOwnPropertyDescriptors(part)));
  return target as T;
}

function createNodeFacts(id: UiNodeId, store: UiNodeStore, fabric: UiEventFabric) {
  return {
    id,
    events$: fabric.nodeEvents(id),
    get snapshot() {
      return store.getSnapshot(id);
    },
    select: <T>(read: (snapshot: UiNodeSnapshot) => T) =>
      store.select(createSelector((state) => read(requireSnapshot(state.nodes[id], id)), [id]))
  };
}

function createControlCommands<TValue extends JsonValue>(id: UiNodeId, execute: Execute) {
  return {
    setValue: (next: TValue) => execute([{ id, type: UiCommandType.ControlSetValue, value: next }]),
    markTouched: () => execute([{ id, type: UiCommandType.ControlMarkTouched }]),
    setDisabled: (disabled: boolean) =>
      execute([{ disabled, id, type: UiCommandType.ControlSetDisabled }]),
    reset: () => execute([{ id, type: UiCommandType.FormReset }])
  };
}

function createControlFacts<TValue extends JsonValue>(selections: ControlSelections<TValue>) {
  return {
    get value() {
      return selections.value.get();
    },
    value$: currentAndChanges(selections.value),
    get rawValue() {
      return selections.rawValue.get();
    },
    rawValue$: currentAndChanges(selections.rawValue),
    get status() {
      return selections.status.get();
    },
    status$: currentAndChanges(selections.status),
    get errors() {
      return selections.errors.get();
    },
    errors$: currentAndChanges(selections.errors)
  };
}

function createControlSelections<TValue extends JsonValue>(
  store: UiNodeStore,
  id: UiNodeId
): ControlSelections<TValue> {
  return {
    errors: selectControl(store, id, (control) => control.errors),
    rawValue: selectControl(store, id, (control) => control.rawValue as TValue),
    status: selectControl(store, id, (control) => control.status),
    value: selectControl(store, id, (control) => control.value as TValue)
  };
}

function disposeSelections<TValue extends JsonValue>(selections: ControlSelections<TValue>): void {
  Object.values(selections).forEach((selection) => selection.dispose());
}

function selectControl<T>(
  store: UiNodeStore,
  id: UiNodeId,
  read: (control: UiControlState) => T
): UiSelection<T> {
  return store.select(
    createSelector((state) => read(requireControl(requireSnapshot(state.nodes[id], id))), [id])
  );
}

function currentAndChanges<T>(selection: UiSelection<T>): Observable<T> {
  return concat(of(selection.get()), selection.changes$);
}

function requireSnapshot(snapshot: UiNodeSnapshot | undefined, id: UiNodeId): UiNodeSnapshot {
  if (snapshot === undefined) throw new Error(`Unknown node: ${id}`);
  return snapshot;
}

function requireControl(snapshot: UiNodeSnapshot): UiControlState {
  if (snapshot.control === undefined) throw new Error(`Node is not a control: ${snapshot.id}`);
  return snapshot.control;
}
