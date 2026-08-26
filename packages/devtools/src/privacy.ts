import { DataClassification } from "@unislang/unifold-contracts";
import {
  UiEventDisclosureMode,
  type UiEvent,
  type UiEventData,
  type UiEventSourceNode,
  type UiNodeSnapshot
} from "@unislang/unifold-events";

import { DevtoolsProjectionMode, type DevtoolsNodeInspection } from "./types.js";

export function projectNode(snapshot: UiNodeSnapshot): DevtoolsNodeInspection {
  const source = sourceNode(snapshot);
  return snapshot.base.dataClassification === DataClassification.Public
    ? Object.freeze({ mode: DevtoolsProjectionMode.Full, snapshot, source })
    : Object.freeze({ mode: DevtoolsProjectionMode.MetadataOnly, source });
}

export function projectTimelineEvent(event: UiEvent): UiEvent {
  const clone = structuredClone(event);
  const data =
    clone.data.disclosure?.mode === UiEventDisclosureMode.MetadataOnly
      ? metadataOnlyData(clone.data)
      : clone.data;
  return freezeValue({ ...clone, data }) as UiEvent;
}

function metadataOnlyData(data: UiEventData): UiEventData {
  return {
    ...(data.disclosure === undefined ? {} : { disclosure: data.disclosure }),
    phase: data.phase,
    runtime: data.runtime,
    ...(data.sourceNode === undefined ? {} : { sourceNode: data.sourceNode })
  };
}

function sourceNode(snapshot: UiNodeSnapshot): UiEventSourceNode {
  return Object.freeze({
    id: snapshot.id,
    instanceId: snapshot.instanceId,
    kind: snapshot.kind,
    ...(snapshot.parentId === undefined ? {} : { parentId: snapshot.parentId }),
    scopePath: snapshot.scopePath,
    type: snapshot.type,
    version: snapshot.definitionVersion
  });
}

function freezeValue<T>(value: T): T {
  if (Array.isArray(value)) return freezeArray(value) as T;
  return freezeNonArray(value);
}

function freezeNonArray<T>(value: T): T {
  if (value !== null && typeof value === "object") return freezeRecord(value);
  return value;
}

function freezeArray(value: unknown[]): readonly unknown[] {
  value.forEach(freezeValue);
  return Object.freeze(value);
}

function freezeRecord<T>(value: T): T {
  Object.values(value as object).forEach(freezeValue);
  return Object.freeze(value);
}
