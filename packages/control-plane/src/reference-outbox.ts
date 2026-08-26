import type { JsonObject } from "@unislang/unifold-contracts";

import type {
  ControlPlaneOutboxAcknowledgeCommand,
  ControlPlaneOutboxEntry,
  ControlPlaneOutboxLeaseCommand,
  ControlPlaneOutboxReleaseCommand
} from "./ports.js";
import {
  ControlPlaneErrorCode,
  ControlPlaneOperationStatus,
  type ControlPlaneRealtimeBatch,
  type ControlPlaneRealtimeMessage,
  type ControlPlaneRealtimeMessageType,
  type ControlPlaneResult
} from "./types.js";
import { failure, oldestAvailableSequence, succeeded } from "./reference-store-helpers.js";
import {
  requireOutboxAcknowledgeCommand,
  requireOutboxLeaseCommand,
  requireOutboxReleaseCommand
} from "./outbox-policy.js";

interface DeliveryRecord {
  attempts: number;
  availableAt: string;
  leaseOwner?: string;
  leaseUntil?: string;
  readonly message: ControlPlaneRealtimeMessage;
}

interface ReferenceOutboxMessage {
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly payload: JsonObject;
  readonly tenantId: string;
  readonly type: ControlPlaneRealtimeMessageType;
}

export class ReferenceControlPlaneOutbox {
  readonly #deliveries = new Map<number, DeliveryRecord>();
  readonly #messages: ControlPlaneRealtimeMessage[] = [];
  readonly #retention: number;
  #nextSequence = 1;

  constructor(retention: number) {
    this.#retention = retention;
  }

  publish(value: ReferenceOutboxMessage): void {
    const message = Object.freeze({ ...structuredClone(value), sequence: this.#nextSequence++ });
    this.#messages.push(message);
    this.#deliveries.set(message.sequence, {
      attempts: 0,
      availableAt: message.occurredAt,
      message
    });
    if (this.#messages.length > this.#retention) this.#messages.shift();
  }

  resume(afterSequence: number): ControlPlaneResult<ControlPlaneRealtimeBatch> {
    const first = this.#messages[0]?.sequence;
    const oldest = oldestAvailableSequence(first, this.#nextSequence);
    if (realtimeGap(this.#messages.length, afterSequence, oldest)) {
      return failure(ControlPlaneOperationStatus.Gap, ControlPlaneErrorCode.RealtimeGap);
    }
    return succeeded({
      latestSequence: this.#nextSequence - 1,
      messages: structuredClone(this.#messages.filter((item) => item.sequence > afterSequence)),
      oldestAvailableSequence: oldest
    });
  }

  lease(command: ControlPlaneOutboxLeaseCommand): readonly ControlPlaneOutboxEntry[] {
    requireOutboxLeaseCommand(command);
    const available = [...this.#deliveries.values()].filter((item) => canLease(item, command));
    return available.slice(0, boundedLimit(command.limit)).map((item) => acquire(item, command));
  }

  acknowledge(command: ControlPlaneOutboxAcknowledgeCommand): number {
    requireOutboxAcknowledgeCommand(command);
    return command.sequences.filter((sequence) => this.acknowledgeOne(sequence, command)).length;
  }

  release(command: ControlPlaneOutboxReleaseCommand): number {
    requireOutboxReleaseCommand(command);
    return command.sequences.filter((sequence) => this.releaseOne(sequence, command)).length;
  }

  messages(): readonly ControlPlaneRealtimeMessage[] {
    return structuredClone(this.#messages);
  }

  private acknowledgeOne(sequence: number, command: ControlPlaneOutboxAcknowledgeCommand): boolean {
    const record = this.#deliveries.get(sequence);
    if (!ownsCurrentLease(record, command.workerId, command.acknowledgedAt)) return false;
    return this.#deliveries.delete(sequence);
  }

  private releaseOne(sequence: number, command: ControlPlaneOutboxReleaseCommand): boolean {
    const record = this.#deliveries.get(sequence);
    if (record?.leaseOwner !== command.workerId) return false;
    record.availableAt = command.availableAt;
    delete record.leaseOwner;
    delete record.leaseUntil;
    return true;
  }
}

function canLease(record: DeliveryRecord, command: ControlPlaneOutboxLeaseCommand): boolean {
  if (Date.parse(record.availableAt) > Date.parse(command.leasedAt)) return false;
  if (record.leaseUntil === undefined) return true;
  return Date.parse(record.leaseUntil) <= Date.parse(command.leasedAt);
}

function acquire(
  record: DeliveryRecord,
  command: ControlPlaneOutboxLeaseCommand
): ControlPlaneOutboxEntry {
  record.attempts += 1;
  record.leaseOwner = command.workerId;
  record.leaseUntil = command.leaseUntil;
  return Object.freeze({ attempts: record.attempts, message: structuredClone(record.message) });
}

function ownsCurrentLease(
  record: DeliveryRecord | undefined,
  workerId: string,
  acknowledgedAt: string
): boolean {
  if (record?.leaseUntil === undefined) return false;
  return [
    record.leaseOwner === workerId,
    Date.parse(acknowledgedAt) <= Date.parse(record.leaseUntil)
  ].every(Boolean);
}

function realtimeGap(messageCount: number, afterSequence: number, oldest: number): boolean {
  return [messageCount > 0, afterSequence < oldest - 1].every(Boolean);
}

function boundedLimit(limit: number): number {
  return Math.max(0, Math.min(100, Math.trunc(limit)));
}
