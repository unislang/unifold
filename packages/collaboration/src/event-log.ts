import type { JsonObject } from "@unislang/unifold-contracts";

import {
  CollaborationErrorCode,
  CollaborationStatus,
  type CollaborationActorContext,
  type CollaborationDiagnostic,
  type CollaborationEvent,
  type CollaborationEventBatch,
  type CollaborationEventType,
  type CollaborationResult
} from "./types.js";

export interface CollaborationEventInput {
  readonly actor: CollaborationActorContext;
  readonly branchId?: string;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly payload: JsonObject;
  readonly type: CollaborationEventType;
}

export class CollaborationEventLog {
  readonly #capacity: number;
  readonly #events: CollaborationEvent[] = [];
  #latestSequence = 0;

  constructor(capacity = 1_000) {
    const valid = [Number.isInteger(capacity), capacity >= 10, capacity <= 10_000].every(Boolean);
    if (!valid) {
      throw new RangeError("Collaboration event capacity must be an integer from 10 to 10,000.");
    }
    this.#capacity = capacity;
  }

  append(input: CollaborationEventInput): CollaborationEvent {
    const event = Object.freeze({
      actorId: input.actor.actorId,
      ...(input.branchId === undefined ? {} : { branchId: input.branchId }),
      correlationId: input.correlationId,
      occurredAt: input.occurredAt,
      payload: Object.freeze(structuredClone(input.payload)),
      sequence: ++this.#latestSequence,
      tenantId: input.actor.tenantId,
      type: input.type
    });
    this.#events.push(event);
    if (this.#events.length > this.#capacity) this.#events.shift();
    return event;
  }

  resume(tenantId: string, afterSequence: number): CollaborationResult<CollaborationEventBatch> {
    const oldest = this.oldestAvailableSequence;
    if (afterSequence < oldest - 1) return gap(oldest, this.#latestSequence);
    const messages = this.#events.filter(
      (event) => event.tenantId === tenantId && event.sequence > afterSequence
    );
    return {
      status: CollaborationStatus.Accepted,
      value: {
        latestSequence: this.#latestSequence,
        messages,
        oldestAvailableSequence: oldest
      }
    };
  }

  get latestSequence(): number {
    return this.#latestSequence;
  }

  get oldestAvailableSequence(): number {
    return this.#events[0]?.sequence ?? this.#latestSequence + 1;
  }
}

function gap(oldest: number, latest: number): CollaborationResult<CollaborationEventBatch> {
  const diagnostic: CollaborationDiagnostic = {
    code: CollaborationErrorCode.RealtimeGap,
    messageKey: "collaboration.realtime.gap"
  };
  return {
    diagnostics: [diagnostic],
    status: CollaborationStatus.Gap,
    value: { latestSequence: latest, messages: [], oldestAvailableSequence: oldest }
  };
}
