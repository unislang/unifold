import { DataClassification, maximumDataClassification } from "@unislang/unifold-contracts";
import {
  UiCommandType,
  UiEventDataSchema,
  UiEventPhase,
  UiEventRedactionReason,
  UiEventType,
  type UiCommand,
  type UiEvent,
  type UiEffectEventChange,
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
import {
  RuntimePublicationBuffer,
  type RuntimePublisherCoordination
} from "./runtime-publication-coordination.js";
import type { UiResolvedExecutionContext } from "./types.js";

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

interface RuntimeEventEnvelope {
  readonly dataschema?: string;
  readonly id?: string;
  readonly subject?: string;
}

export class RuntimePublisher {
  #sequence = 0;
  readonly #coordination = new RuntimePublicationBuffer();

  constructor(private readonly options: RuntimePublisherOptions) {}

  nextSequence(): number {
    this.#sequence += 1;
    return this.#sequence;
  }

  beginCoordination(): RuntimePublisherCoordination {
    return this.#coordination.begin(
      this.#sequence,
      (event) => this.publishNow(event),
      (sequence) => {
        this.#sequence = sequence;
      }
    );
  }

  emit(
    type: UiEventType,
    context: UiResolvedExecutionContext,
    record: UiTransactionRecord,
    change: Parameters<typeof createRuntimeEvent>[3],
    phase?: UiEventPhase,
    projection: RuntimeEventProjection = {},
    envelope: RuntimeEventEnvelope = {}
  ): void {
    this.publish(
      createRuntimeEvent(
        type,
        this.eventContext(context, envelope),
        record,
        change,
        phase,
        projection
      )
    );
  }

  command(
    command: UiCommand,
    context: UiResolvedExecutionContext,
    record: UiTransactionRecord,
    before: readonly UiNodeSnapshot[] = [],
    effect = false
  ): string | undefined {
    const projection = commandProjection(command, this.commandSnapshot(command, before));
    const id = this.options.createId();
    this.emit(
      commandType(command),
      context,
      record,
      disclosedCommandChange(command, projection),
      undefined,
      projection,
      commandEnvelope(id, effect)
    );
    return effectIdentity(id, effect);
  }

  transaction(
    context: UiResolvedExecutionContext,
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

  rejected(context: UiResolvedExecutionContext, revision: number): void {
    const record = rejectedRecord(context, revision, this.options.now);
    this.emit(UiEventType.TransactionRejected, context, record, {});
  }

  formResult(
    command: UiCommand,
    context: UiResolvedExecutionContext,
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
    context: UiResolvedExecutionContext,
    record: UiTransactionRecord,
    effectId: string
  ): void {
    const projection = commandProjection(command, this.effectSnapshot(command, context));
    this.emit(type, context, record, effectChange(command), UiEventPhase.Effect, projection, {
      dataschema: UiEventDataSchema.EffectV1,
      subject: effectId
    });
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

  private effectSnapshot(
    command: UiCommand,
    context: UiResolvedExecutionContext
  ): UiNodeSnapshot | undefined {
    if (context.effectSourceId !== undefined) return this.options.snapshot(context.effectSourceId);
    return this.commandSnapshot(command, []);
  }

  private requireSnapshot(id: string): UiNodeSnapshot {
    const snapshot = this.options.snapshot(id);
    if (snapshot === undefined) throw new Error(`Runtime snapshot is missing: ${id}.`);
    return snapshot;
  }

  private eventContext(
    context: UiResolvedExecutionContext,
    envelope: RuntimeEventEnvelope = {}
  ): RuntimeEventContext {
    return {
      causationId: context.causationId,
      correlationId: context.correlationId,
      ...envelope,
      documentId: this.options.documentId,
      id: envelope.id ?? this.options.createId(),
      sequence: this.nextSequence(),
      source: this.options.source,
      time: this.options.now(),
      transactionId: context.transactionId
    };
  }

  publish(event: UiEvent): void {
    if (!this.#coordination.append(event)) this.publishNow(event);
  }

  private publishNow(event: UiEvent): void {
    this.options.fabric.publish(event);
    this.options.actors.route(event);
  }
}

function effectChange(command: UiCommand): UiEffectEventChange {
  const targetId = effectTargetId(command);
  return {
    commandType: command.type,
    ...(targetId === undefined ? {} : { targetId })
  };
}

function effectTargetId(command: UiCommand): string | undefined {
  return "id" in command ? command.id : undefined;
}

function commandEnvelope(id: string, effect: boolean): RuntimeEventEnvelope {
  return effect ? { id, subject: id } : { id };
}

function effectIdentity(id: string, effect: boolean): string | undefined {
  return effect ? id : undefined;
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
  const byId = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
  return snapshots.filter((snapshot) => belongsToForm(snapshot, id, byId));
}

function belongsToForm(
  snapshot: UiNodeSnapshot,
  formId: string,
  byId: ReadonlyMap<string, UiNodeSnapshot>
): boolean {
  if (snapshot.scopePath.includes(formId)) return true;
  return controlPathIncludes(snapshot, formId, byId);
}

function controlPathIncludes(
  snapshot: UiNodeSnapshot,
  formId: string,
  byId: ReadonlyMap<string, UiNodeSnapshot>
): boolean {
  return controlPath(snapshot, byId).some(({ id }) => id === formId);
}

function controlPath(
  snapshot: UiNodeSnapshot,
  byId: ReadonlyMap<string, UiNodeSnapshot>
): readonly UiNodeSnapshot[] {
  const path: UiNodeSnapshot[] = [];
  let current: UiNodeSnapshot | undefined = snapshot;
  while (current !== undefined) {
    path.push(current);
    current = controlParent(current, byId);
  }
  return path;
}

function controlParent(
  snapshot: UiNodeSnapshot,
  byId: ReadonlyMap<string, UiNodeSnapshot>
): UiNodeSnapshot | undefined {
  const parentId = hasExplicitTopology(snapshot) ? snapshot.controlParentId : snapshot.parentId;
  return parentId === undefined ? undefined : byId.get(parentId);
}

function hasExplicitTopology(snapshot: UiNodeSnapshot): boolean {
  return [snapshot.controlChildIds, snapshot.controlKey, snapshot.controlParentId].some(
    (value) => value !== undefined
  );
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
