import type { JsonObject } from "@unislang/unifold-contracts";
import {
  createUiEvent,
  UiCommandType,
  UiEventPhase,
  UiEventType,
  UiValidationCancellationReason,
  type UiCommand,
  type UiEvent,
  type UiEventDisclosure,
  type UiEventSourceNode,
  type UiNodeSnapshot,
  type UiTransactionRecord
} from "@unislang/unifold-events";

export interface RuntimeEventContext {
  readonly causationId?: string;
  readonly correlationId: string;
  readonly documentId: string;
  readonly id: string;
  readonly sequence: number;
  readonly source: string;
  readonly time: string;
  readonly transactionId: string;
}

interface RuntimeEventDataProjection {
  readonly disclosure?: UiEventDisclosure;
  readonly snapshot?: UiNodeSnapshot;
  readonly source?: UiEventSourceNode;
}

export function commandType(command: UiCommand): UiEventType {
  return validationEventTypes[commandKey(command)] ?? UiEventType.CommandApplied;
}

export function commandChange(command: UiCommand): JsonObject {
  const create = validationChanges.get(command.type);
  return create === undefined ? baseChange(command) : create(command);
}

const validationEventTypes: Readonly<Record<string, UiEventType>> = {
  [UiCommandType.ControlValidationStart]: UiEventType.ValidationStarted,
  [UiCommandType.ControlValidationResolve]: UiEventType.ValidationCompleted,
  [UiCommandType.ControlValidationCancel]: UiEventType.ValidationCancelled,
  [`${UiCommandType.ControlValidationCancel}:${UiValidationCancellationReason.Failed}`]:
    UiEventType.ValidationFailed
};

const validationChanges = new Map<UiCommandType, (command: UiCommand) => JsonObject>([
  [UiCommandType.ControlValidationStart, startChange],
  [UiCommandType.ControlValidationResolve, resolveChange],
  [UiCommandType.ControlValidationCancel, cancelChange],
  [UiCommandType.StructureReconcile, reconcileChange]
]);

function commandKey(command: UiCommand): string {
  const failed = "reason" in command && command.reason === UiValidationCancellationReason.Failed;
  return failed ? `${command.type}:${command.reason}` : command.type;
}

function baseChange(command: UiCommand): JsonObject {
  return { commandType: command.type };
}

function startChange(command: UiCommand): JsonObject {
  if (command.type !== UiCommandType.ControlValidationStart) return baseChange(command);
  return { ...baseChange(command), requestId: command.requestId };
}

function resolveChange(command: UiCommand): JsonObject {
  if (command.type !== UiCommandType.ControlValidationResolve) return baseChange(command);
  return {
    ...baseChange(command),
    errorCount: command.errors.length,
    requestId: command.requestId
  };
}

function cancelChange(command: UiCommand): JsonObject {
  if (command.type !== UiCommandType.ControlValidationCancel) return baseChange(command);
  return {
    ...baseChange(command),
    ...(command.error === undefined ? {} : { error: command.error }),
    reason: command.reason,
    requestId: command.requestId
  };
}

function reconcileChange(command: UiCommand): JsonObject {
  if (command.type !== UiCommandType.StructureReconcile) return baseChange(command);
  if (command.collectionOperation === undefined) return baseChange(command);
  return { ...baseChange(command), collectionOperation: command.collectionOperation };
}

export function createRuntimeEvent(
  type: UiEventType,
  context: RuntimeEventContext,
  record: UiTransactionRecord,
  change: JsonObject,
  phase?: UiEventPhase,
  projection?: RuntimeEventDataProjection
): UiEvent {
  return createUiEvent({
    id: context.id,
    source: context.source,
    type,
    time: context.time,
    correlationid: context.correlationId,
    ...(context.causationId ? { causationid: context.causationId } : {}),
    transactionid: context.transactionId,
    sequence: context.sequence,
    staterevision: record.revision,
    data: runtimeEventData(phase ?? UiEventPhase.State, context.documentId, change, projection)
  });
}

function runtimeEventData(
  phase: UiEventPhase,
  documentId: string,
  change: JsonObject,
  projection?: RuntimeEventDataProjection
) {
  return {
    phase,
    change,
    runtime: { documentId },
    ...projectedEventData(projection)
  };
}

function projectedEventData(projection?: RuntimeEventDataProjection) {
  if (projection === undefined) return {};
  return {
    ...optionalSource(resolveSource(projection.source, projection.snapshot)),
    ...optionalSnapshot(projection.snapshot),
    ...optionalDisclosure(projection.disclosure)
  };
}

function optionalSource(source?: UiEventSourceNode) {
  return source === undefined ? {} : { sourceNode: source };
}

function optionalSnapshot(snapshot?: UiNodeSnapshot) {
  return snapshot === undefined ? {} : { snapshot };
}

function optionalDisclosure(disclosure?: UiEventDisclosure) {
  return disclosure === undefined ? {} : { disclosure };
}

function resolveSource(
  source: UiEventSourceNode | undefined,
  snapshot: UiNodeSnapshot | undefined
): UiEventSourceNode | undefined {
  if (source !== undefined) return source;
  if (snapshot === undefined) return undefined;
  return eventSourceNode(snapshot);
}

export function eventSourceNode(snapshot: UiNodeSnapshot): UiEventSourceNode {
  return {
    id: snapshot.id,
    instanceId: snapshot.instanceId,
    kind: snapshot.kind,
    ...(snapshot.parentId ? { parentId: snapshot.parentId } : {}),
    scopePath: snapshot.scopePath,
    type: snapshot.type,
    version: snapshot.definitionVersion
  };
}
