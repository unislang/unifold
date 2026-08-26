import { DataClassification } from "@unislang/unifold-contracts";
import {
  UiEventDisclosureMode,
  UiEventRedactionReason,
  type UiEvent,
  type UiEventDisclosure,
  type UiEventSourceNode,
  type UiNodeSnapshot
} from "@unislang/unifold-events";

import { eventSourceNode } from "./runtime-event.js";

export interface RuntimeEventProjection {
  readonly disclosure?: UiEventDisclosure;
  readonly snapshot?: UiNodeSnapshot;
  readonly source?: UiEventSourceNode;
}

interface ClassifiedEventProjection extends RuntimeEventProjection {
  readonly disclosure: UiEventDisclosure;
  readonly source: UiEventSourceNode;
}

interface RuntimeProjectionOptions {
  readonly classification?: DataClassification;
  readonly reason?: UiEventRedactionReason;
  readonly revision?: number;
}

export function projectSnapshot(
  snapshot: UiNodeSnapshot | undefined,
  options?: RuntimeProjectionOptions
): RuntimeEventProjection {
  if (snapshot === undefined) return {};
  return projectClassifiedSnapshot(snapshot, options);
}

function projectClassifiedSnapshot(
  snapshot: UiNodeSnapshot,
  options?: RuntimeProjectionOptions
): ClassifiedEventProjection {
  const classification = resolveClassification(snapshot, options);
  const disclosure = createDisclosure(snapshot, classification, options);
  const source = eventSourceNode(snapshot);
  return disclosure.mode === UiEventDisclosureMode.Full
    ? { disclosure, snapshot, source }
    : { disclosure, source };
}

export function projectIntent(event: UiEvent, snapshot: UiNodeSnapshot): UiEvent {
  const projection = projectClassifiedSnapshot(snapshot);
  const data = projectedIntentData(event, snapshot, projection);
  return Object.freeze({ ...event, data });
}

export function isMetadataOnly(projection: RuntimeEventProjection): boolean {
  return projection.disclosure?.mode === UiEventDisclosureMode.MetadataOnly;
}

function createDisclosure(
  snapshot: UiNodeSnapshot,
  classification: DataClassification,
  options?: RuntimeProjectionOptions
): UiEventDisclosure {
  const reason = projectionReason(options);
  return {
    classification,
    mode: disclosureMode(classification, reason),
    ...disclosureReason(classification, reason),
    snapshotRevision: projectionRevision(snapshot, options)
  };
}

function projectionReason(options?: RuntimeProjectionOptions) {
  return options?.reason;
}

function projectionRevision(snapshot: UiNodeSnapshot, options?: RuntimeProjectionOptions) {
  return options?.revision ?? snapshot.revision;
}

function resolveClassification(snapshot: UiNodeSnapshot, options?: RuntimeProjectionOptions) {
  return options?.classification ?? snapshot.base.dataClassification;
}

function disclosureMode(
  classification: DataClassification,
  reason?: UiEventRedactionReason
): UiEventDisclosureMode {
  if (reason !== undefined) return UiEventDisclosureMode.MetadataOnly;
  return classification === DataClassification.Public
    ? UiEventDisclosureMode.Full
    : UiEventDisclosureMode.MetadataOnly;
}

function disclosureReason(classification: DataClassification, reason?: UiEventRedactionReason) {
  if (reason !== undefined) return { reason };
  if (classification === DataClassification.Public) return {};
  return { reason: UiEventRedactionReason.Classification };
}

function projectedIntentData(
  event: UiEvent,
  snapshot: UiNodeSnapshot,
  projection: ClassifiedEventProjection
) {
  const shared = intentMetadata(projection, event);
  return isMetadataOnly(projection) ? shared : fullIntentData(event, snapshot, shared);
}

function fullIntentData(
  event: UiEvent,
  snapshot: UiNodeSnapshot,
  shared: ReturnType<typeof intentMetadata>
) {
  return {
    ...shared,
    ...(event.data.change === undefined ? {} : { change: event.data.change }),
    snapshot
  };
}

function intentMetadata(projection: ClassifiedEventProjection, event: UiEvent) {
  return {
    disclosure: projection.disclosure,
    phase: event.data.phase,
    runtime: event.data.runtime,
    sourceNode: projection.source
  };
}
