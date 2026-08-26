import {
  UiCompositionExportKind,
  UiCompositionSelectionKind,
  type UiCompositionInstanceManifest,
  type UiResolvedCompositionExport
} from "@unislang/unifold-contracts";
import type { UiEvent, UiNodeSnapshot } from "@unislang/unifold-events";
import {
  createSelector,
  type UiEventFabric,
  type UiNodeStore,
  type UiSelection
} from "@unislang/unifold-reactivity";
import { filter, type Observable } from "rxjs";

import { createScopeHandle } from "./node-handle.js";
import type { UiCompositionCommandTarget, UiCompositionHandle } from "./types.js";

type SelectionReader = (snapshot: UiNodeSnapshot) => unknown;

const selectionReaders: Readonly<Record<UiCompositionSelectionKind, SelectionReader>> = {
  [UiCompositionSelectionKind.ControlValue]: (snapshot) => snapshot.control?.value,
  [UiCompositionSelectionKind.Properties]: (snapshot) => snapshot.properties,
  [UiCompositionSelectionKind.Snapshot]: (snapshot) => snapshot
};

export function createCompositionHandle(
  instanceId: string,
  resolve: () => UiCompositionInstanceManifest | undefined,
  store: UiNodeStore,
  fabric: UiEventFabric
): UiCompositionHandle {
  const current = () => requireInstance(resolve(), instanceId);
  const exported = (alias: string, kind: UiCompositionExportKind) =>
    requireExport(current(), alias, kind);
  const instance = current();
  const scope = createScopeHandle(instance.rootNodeId, store, fabric);
  return {
    get definitionName() {
      return current().definitionName;
    },
    get definitionVersion() {
      return current().definitionVersion;
    },
    events$: scope.events$,
    id: scope.id,
    get snapshot() {
      return scope.snapshot;
    },
    command: (alias) => commandTarget(exported(alias, UiCompositionExportKind.Command)),
    exportedEvents: (alias) => eventView(exported(alias, UiCompositionExportKind.Event), fabric),
    select: scope.select,
    selection: (alias) => selectionView(exported(alias, UiCompositionExportKind.Selection), store),
    selectionKind: (alias) => selectionKind(exported(alias, UiCompositionExportKind.Selection))
  };
}

function requireInstance(
  instance: UiCompositionInstanceManifest | undefined,
  id: string
): UiCompositionInstanceManifest {
  if (instance === undefined) throw new Error(`Unknown composition instance: ${id}.`);
  return instance;
}

function selectionView(
  descriptor: UiResolvedCompositionExport,
  store: UiNodeStore
): UiSelection<unknown> {
  const kind = selectionKind(descriptor);
  return store.select(
    createSelector(
      (state) =>
        selectionReaders[kind](requireSnapshot(state.nodes[descriptor.nodeId], descriptor.nodeId)),
      [descriptor.nodeId]
    )
  );
}

function eventView(
  descriptor: UiResolvedCompositionExport,
  fabric: UiEventFabric
): Observable<UiEvent> {
  const events = fabric.nodeEvents(descriptor.nodeId);
  if (descriptor.kind !== UiCompositionExportKind.Event || descriptor.eventType === undefined)
    return events;
  return events.pipe(filter((event) => event.type === descriptor.eventType));
}

function commandTarget(descriptor: UiResolvedCompositionExport): UiCompositionCommandTarget {
  if (descriptor.kind !== UiCompositionExportKind.Command) throw invalidExportKind();
  return { commandType: descriptor.commandType, nodeId: descriptor.nodeId };
}

function selectionKind(descriptor: UiResolvedCompositionExport): UiCompositionSelectionKind {
  if (descriptor.kind !== UiCompositionExportKind.Selection) throw invalidExportKind();
  return descriptor.selection;
}

function requireExport(
  instance: UiCompositionInstanceManifest,
  alias: string,
  kind: UiCompositionExportKind
): UiResolvedCompositionExport {
  const descriptor = instance.exports[alias];
  if (descriptor === undefined)
    throw new Error(`Unknown composition export: ${instance.instanceId}.${alias}.`);
  if (descriptor.kind !== kind)
    throw new Error(`Composition export ${instance.instanceId}.${alias} is not ${kind}.`);
  return descriptor;
}

function requireSnapshot(snapshot: UiNodeSnapshot | undefined, id: string): UiNodeSnapshot {
  if (snapshot === undefined) throw new Error(`Unknown composition export node: ${id}.`);
  return snapshot;
}

function invalidExportKind(): Error {
  return new Error("Composition export kind does not match its typed accessor.");
}
