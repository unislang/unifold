import { DataClassification, maximumDataClassification } from "@unislang/unifold-contracts";
import {
  UiCommandType,
  UiEventPhase,
  UiEventRedactionReason,
  UiEventType,
  type UiCommand,
  type UiEvent,
  type UiNodeSnapshot,
  type UiTransactionRecord
} from "@unislang/unifold-events";
import type { UiEventFabricController } from "@unislang/unifold-reactivity";
import type { XStateEventRouter } from "@unislang/unifold-xstate";

import { createFormResult, isFormResultCommand } from "./form-result.js";
import { isMetadataOnly, projectIntent, projectSnapshot } from "./event-disclosure.js";
import type { RuntimeEventProjection } from "./event-disclosure.js";
import { commandChange, commandType, createRuntimeEvent } from "./runtime-event.js";
import type { RuntimeEventContext } from "./runtime-event.js";
import { commandNodeId, rejectedRecord, transactionSourceId } from "./runtime-helpers.js";
import type { UiExecutionContext } from "./types.js";

interface RuntimePublisherOptions {
  readonly actors: XStateEventRouter;
  readonly createId: () => string;
  readonly documentId: string;
  readonly fabric: UiEventFabricController;
  readonly now: () => string;
  readonly snapshot: (id: string) => UiNodeSnapshot | undefined;
  readonly snapshots: () => readonly UiNodeSnapshot[];
  readonly source: string;
}

export class RuntimePublisher {
  #sequence = 0;

  constructor(private readonly options: RuntimePublisherOptions) {}

  nextSequence(): number {
    this.#sequence += 1;
    return this.#sequence;
  }

  emit(
    type: UiEventType,
    context: Required<UiExecutionContext>,
    record: UiTransactionRecord,
    change: Parameters<typeof createRuntimeEvent>[3],
    phase?: UiEventPhase,
    projection: RuntimeEventProjection = {}
  ): void {
    this.publish(
      createRuntimeEvent(type, this.eventContext(context), record, change, phase, projection)
    );
  }

  command(
    command: UiCommand,
    context: Required<UiExecutionContext>,
    record: UiTransactionRecord,
    before: readonly UiNodeSnapshot[] = []
  ): void {
    const projection = commandProjection(command, this.commandSnapshot(command, before));
    this.emit(
      commandType(command),
      context,
      record,
      disclosedCommandChange(command, projection),
      undefined,
      projection
    );
  }

  transaction(
    context: Required<UiExecutionContext>,
    record: UiTransactionRecord,
    before: readonly UiNodeSnapshot[],
    commands: readonly UiCommand[] = []
  ): void {
    if (record.revision === record.previousRevision) return;
    const relevant = transactionSnapshots(record.changedNodeIds, before, this.options.snapshots());
    const snapshot = transactionSnapshot(
      transactionSourceId(commands, record.changedNodeIds),
      relevant
    );
    const classification = classificationOf(relevant);
    const projection = projectSnapshot(snapshot, { classification, revision: record.revision });
    this.emit(
      UiEventType.TransactionCommitted,
      context,
      record,
      { changedNodeIds: [...record.changedNodeIds], changedPaths: [...record.changedPaths] },
      undefined,
      projection
    );
  }

  rejected(context: Required<UiExecutionContext>, revision: number): void {
    const record = rejectedRecord(context, revision, this.options.now);
    this.emit(UiEventType.TransactionRejected, context, record, {});
  }

  formResult(
    command: UiCommand,
    context: Required<UiExecutionContext>,
    record: UiTransactionRecord
  ): void {
    if (!isFormResultCommand(command)) return;
    const snapshot = this.requireSnapshot(command.id);
    const result = createFormResult(command, snapshot);
    if (result === undefined) throw new Error("Form command did not produce a result.");
    const classification = classificationOf(formSnapshots(command.id, this.options.snapshots()));
    const projection = projectSnapshot(result.snapshot, { classification });
    this.emit(
      result.type,
      context,
      record,
      formChange(result.change, projection),
      undefined,
      projection
    );
  }

  effect(
    type: UiEventType,
    command: UiCommand,
    context: Required<UiExecutionContext>,
    record: UiTransactionRecord
  ): void {
    const projection = commandProjection(command, this.commandSnapshot(command, []));
    this.emit(
      type,
      context,
      record,
      { commandType: command.type },
      UiEventPhase.Effect,
      projection
    );
  }

  intent(event: UiEvent, snapshot: UiNodeSnapshot): void {
    this.publish(projectIntent(event, snapshot));
  }

  private commandSnapshot(
    command: UiCommand,
    fallback: readonly UiNodeSnapshot[]
  ): UiNodeSnapshot | undefined {
    const id = commandNodeId(command);
    if (id === undefined) return undefined;
    return this.options.snapshot(id) ?? fallback.find((snapshot) => snapshot.id === id);
  }

  private requireSnapshot(id: string): UiNodeSnapshot {
    const snapshot = this.options.snapshot(id);
    if (snapshot === undefined) throw new Error(`Runtime snapshot is missing: ${id}.`);
    return snapshot;
  }

  private eventContext(context: Required<UiExecutionContext>): RuntimeEventContext {
    return {
      causationId: context.causationId,
      correlationId: context.correlationId,
      documentId: this.options.documentId,
      id: this.options.createId(),
      sequence: this.nextSequence(),
      source: this.options.source,
      time: this.options.now(),
      transactionId: context.transactionId
    };
  }

  publish(event: UiEvent): void {
    this.options.fabric.publish(event);
    this.options.actors.route(event);
  }
}

function transactionSnapshot(
  sourceId: string | undefined,
  snapshots: readonly UiNodeSnapshot[]
): UiNodeSnapshot | undefined {
  if (sourceId === undefined) return snapshots[0];
  return snapshots.find(({ id }) => id === sourceId) ?? snapshots[0];
}

function commandProjection(
  command: UiCommand,
  snapshot: UiNodeSnapshot | undefined
): RuntimeEventProjection {
  const reason =
    command.type === UiCommandType.StoreWrite ? UiEventRedactionReason.StoreWrite : undefined;
  return projectSnapshot(snapshot, reason === undefined ? {} : { reason });
}

function disclosedCommandChange(command: UiCommand, projection: RuntimeEventProjection) {
  const change = commandChange(command);
  if (!isMetadataOnly(projection)) return change;
  const metadata = { ...change };
  Reflect.deleteProperty(metadata, "error");
  return metadata;
}

function transactionSnapshots(
  ids: readonly string[],
  before: readonly UiNodeSnapshot[],
  after: readonly UiNodeSnapshot[]
): readonly UiNodeSnapshot[] {
  const changed = new Set(ids);
  return [...after, ...before].filter(({ id }) => changed.has(id));
}

function formSnapshots(id: string, snapshots: readonly UiNodeSnapshot[]) {
  return snapshots.filter(({ scopePath }) => scopePath.includes(id));
}

function classificationOf(snapshots: readonly UiNodeSnapshot[]): DataClassification {
  return maximumDataClassification(snapshots.map(({ base }) => base.dataClassification));
}

function formChange(
  change: Parameters<typeof createRuntimeEvent>[3],
  projection: RuntimeEventProjection
) {
  if (!isMetadataOnly(projection)) return change;
  const errors = change["errors"];
  return Array.isArray(errors) ? { errorCount: errors.length } : {};
}
