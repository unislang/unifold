import {
  UiCommandType,
  type JsonValue,
  type StoreWriteCommand,
  type UiCommand,
  type UiNodeSnapshot
} from "@unislang/unifold-events";

import type { UiRuntimeStoreBinding } from "./types.js";

type BoundValues = ReadonlyMap<string, JsonValue>;
const valueCommandTypes = new Set<UiCommandType>([
  UiCommandType.ControlMarkTouched,
  UiCommandType.ControlSetValue
]);
const scopeCommandTypes = new Set<UiCommandType>([
  UiCommandType.FormReset,
  UiCommandType.FormSubmit
]);

export function captureBoundValues(
  commands: readonly UiCommand[],
  bindings: Readonly<Record<string, UiRuntimeStoreBinding>>,
  snapshots: readonly UiNodeSnapshot[]
): BoundValues {
  const candidates = candidateIds(commands, bindings, snapshots);
  return new Map(
    candidates.flatMap((id) => {
      const value = controlValue(snapshots.find((snapshot) => snapshot.id === id));
      return value === undefined ? [] : [[id, value] as const];
    })
  );
}

export function changedStoreWrites(
  previous: BoundValues,
  bindings: Readonly<Record<string, UiRuntimeStoreBinding>>,
  snapshot: (id: string) => UiNodeSnapshot | undefined
): readonly StoreWriteCommand[] {
  return [...previous].flatMap(([id, value]) => storeWrite(id, value, bindings, snapshot));
}

export function storeWriteEffects(
  suppressedStoreIds: readonly string[],
  previous: BoundValues,
  bindings: Readonly<Record<string, UiRuntimeStoreBinding>>,
  snapshot: (id: string) => UiNodeSnapshot | undefined
): readonly StoreWriteCommand[] {
  const suppressed = new Set(suppressedStoreIds);
  return changedStoreWrites(previous, bindings, snapshot).filter(
    ({ storeId }) => !suppressed.has(storeId)
  );
}

function storeWrite(
  id: string,
  previous: JsonValue,
  bindings: Readonly<Record<string, UiRuntimeStoreBinding>>,
  snapshot: (id: string) => UiNodeSnapshot | undefined
): readonly StoreWriteCommand[] {
  const current = controlValue(snapshot(id));
  if (current === undefined) return [];
  if (sameValue(previous, current)) return [];
  const binding = requireBinding(bindings, id);
  return [storeWriteCommand(id, current, binding)];
}

function storeWriteCommand(
  id: string,
  value: JsonValue,
  binding: UiRuntimeStoreBinding
): StoreWriteCommand {
  return {
    id,
    path: binding.path,
    storeId: binding.storeId,
    type: UiCommandType.StoreWrite,
    value
  };
}

function requireBinding(
  bindings: Readonly<Record<string, UiRuntimeStoreBinding>>,
  id: string
): UiRuntimeStoreBinding {
  const binding = ownBinding(bindings, id);
  if (binding === undefined) throw new Error(`Runtime store binding is missing: ${id}.`);
  return binding;
}

function candidateIds(
  commands: readonly UiCommand[],
  bindings: Readonly<Record<string, UiRuntimeStoreBinding>>,
  snapshots: readonly UiNodeSnapshot[]
): readonly string[] {
  const ids = new Set<string>();
  commands.forEach((command) => addCommandCandidates(command, bindings, snapshots, ids));
  return [...ids];
}

function addCommandCandidates(
  command: UiCommand,
  bindings: Readonly<Record<string, UiRuntimeStoreBinding>>,
  snapshots: readonly UiNodeSnapshot[],
  ids: Set<string>
): void {
  if (scopeCommandTypes.has(command.type))
    return addScopeCommand(command, bindings, snapshots, ids);
  if (!valueCommandTypes.has(command.type)) return;
  addValueCandidate(command, bindings, ids);
}

function addScopeCommand(
  command: UiCommand,
  bindings: Readonly<Record<string, UiRuntimeStoreBinding>>,
  snapshots: readonly UiNodeSnapshot[],
  ids: Set<string>
): void {
  if (!("id" in command)) return;
  addScopeCandidates(command.id, bindings, snapshots, ids);
}

function addValueCandidate(
  command: UiCommand,
  bindings: Readonly<Record<string, UiRuntimeStoreBinding>>,
  ids: Set<string>
): void {
  if (!("id" in command)) return;
  if (ownBinding(bindings, command.id) === undefined) return;
  ids.add(command.id);
}

function addScopeCandidates(
  scopeId: string,
  bindings: Readonly<Record<string, UiRuntimeStoreBinding>>,
  snapshots: readonly UiNodeSnapshot[],
  ids: Set<string>
): void {
  snapshots.forEach((snapshot) => {
    if (ownBinding(bindings, snapshot.id) === undefined) return;
    if (snapshot.scopePath.includes(scopeId)) ids.add(snapshot.id);
  });
}

function ownBinding(
  bindings: Readonly<Record<string, UiRuntimeStoreBinding>>,
  id: string
): UiRuntimeStoreBinding | undefined {
  return Object.hasOwn(bindings, id) ? bindings[id] : undefined;
}

function controlValue(snapshot: UiNodeSnapshot | undefined): JsonValue | undefined {
  return snapshot?.control?.value;
}

function sameValue(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
