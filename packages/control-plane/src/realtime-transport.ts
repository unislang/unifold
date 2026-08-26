import type { ControlPlaneService } from "./service.js";
import { safeJson } from "./transport-validation.js";
import {
  ControlPlaneOperation,
  ControlPlaneOperationStatus,
  type ControlPlaneRealtimeBatch,
  type ControlPlaneRealtimeMessage,
  type ControlPlaneRequestMetadata,
  type ControlPlaneResult
} from "./types.js";

export enum ControlPlaneRealtimeProtocolErrorCode {
  InvalidBatch = "invalid-batch",
  MessageLimitExceeded = "message-limit-exceeded"
}

export class ControlPlaneRealtimeProtocolError extends Error {
  readonly code: ControlPlaneRealtimeProtocolErrorCode;

  constructor(code: ControlPlaneRealtimeProtocolErrorCode) {
    super(`Control-plane realtime ${code}.`);
    this.code = code;
    this.name = "ControlPlaneRealtimeProtocolError";
  }
}

export interface ControlPlaneRealtimePollRequest extends ControlPlaneRequestMetadata {
  readonly sessionToken: string;
}

export interface ControlPlaneRealtimeCursorOptions {
  readonly initialSequence?: number;
  readonly maximumMessages?: number;
}

export interface ControlPlaneRealtimeCursor {
  readonly afterSequence: number;
  poll(
    request: ControlPlaneRealtimePollRequest
  ): Promise<ControlPlaneResult<ControlPlaneRealtimeBatch>>;
  resetAfterAuthoritativeRead(sequence: number): void;
}

export function createControlPlaneRealtimeCursor(
  service: Pick<ControlPlaneService, "resumeRealtime">,
  options?: ControlPlaneRealtimeCursorOptions
): ControlPlaneRealtimeCursor {
  return new RealtimeCursorImplementation(service, options);
}

class RealtimeCursorImplementation implements ControlPlaneRealtimeCursor {
  readonly #maximumMessages: number;
  readonly #service: Pick<ControlPlaneService, "resumeRealtime">;
  #cursor: number;

  constructor(
    service: Pick<ControlPlaneService, "resumeRealtime">,
    options: ControlPlaneRealtimeCursorOptions | undefined
  ) {
    this.#cursor = configuredInitialSequence(options);
    this.#maximumMessages = configuredMaximum(options?.maximumMessages);
    this.#service = service;
  }

  get afterSequence(): number {
    return this.#cursor;
  }

  async poll(
    request: ControlPlaneRealtimePollRequest
  ): Promise<ControlPlaneResult<ControlPlaneRealtimeBatch>> {
    const result = await this.#service.resumeRealtime({
      ...request,
      afterSequence: this.#cursor,
      operation: ControlPlaneOperation.RealtimeResume
    });
    if (result.status !== ControlPlaneOperationStatus.Succeeded) return result;
    const batch = requireBatch(result.value, this.#cursor, this.#maximumMessages);
    this.#cursor = batch.latestSequence;
    return result;
  }

  resetAfterAuthoritativeRead(sequence: number): void {
    this.#cursor = validSequence(sequence);
  }
}

function requireBatch(
  value: ControlPlaneRealtimeBatch | undefined,
  cursor: number,
  maximumMessages: number
): ControlPlaneRealtimeBatch {
  if (!validBatchShape(value)) throw invalidBatch();
  requireMessageLimit(value, maximumMessages);
  if (!validBatchSequence(value, cursor)) throw invalidBatch();
  return value;
}

function requireMessageLimit(batch: ControlPlaneRealtimeBatch, maximumMessages: number): void {
  if (batch.messages.length <= maximumMessages) return;
  throw new ControlPlaneRealtimeProtocolError(
    ControlPlaneRealtimeProtocolErrorCode.MessageLimitExceeded
  );
}

function validBatchShape(value: unknown): value is ControlPlaneRealtimeBatch {
  if (!record(value)) return false;
  const messages = value["messages"];
  return [
    safeJson(value),
    Number.isSafeInteger(value["latestSequence"]),
    Number.isSafeInteger(value["oldestAvailableSequence"]),
    Array.isArray(messages),
    Array.isArray(messages) ? messages.every(validMessage) : false
  ].every(Boolean);
}

function validMessage(value: unknown): value is ControlPlaneRealtimeMessage {
  if (!record(value)) return false;
  return [
    Number.isSafeInteger(value["sequence"]),
    text(value["tenantId"]),
    text(value["correlationId"]),
    text(value["occurredAt"]),
    text(value["type"]),
    record(value["payload"])
  ].every(Boolean);
}

function validBatchSequence(batch: ControlPlaneRealtimeBatch, cursor: number): boolean {
  const boundaries = [
    batch.latestSequence >= cursor,
    batch.oldestAvailableSequence >= 1,
    batch.oldestAvailableSequence <= cursor + 1
  ].every(Boolean);
  if (!boundaries) return false;
  return batch.messages.length === 0
    ? batch.latestSequence === cursor
    : validMessageSequence(batch, cursor);
}

function validMessageSequence(batch: ControlPlaneRealtimeBatch, cursor: number): boolean {
  const tenantId = batch.messages[0]?.tenantId;
  const contiguous = batch.messages.every((message, index) =>
    [message.sequence === cursor + index + 1, message.tenantId === tenantId].every(Boolean)
  );
  return [contiguous, batch.messages.at(-1)?.sequence === batch.latestSequence].every(Boolean);
}

function validSequence(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("Realtime sequence must be a non-negative safe integer.");
  }
  return value;
}

function configuredMaximum(value: number | undefined): number {
  if (value === undefined) return 1000;
  if (![Number.isSafeInteger(value), value >= 1, value <= 10_000].every(Boolean)) {
    throw new RangeError("Realtime message limit must be an integer from 1 through 10000.");
  }
  return value;
}

function configuredInitialSequence(options: ControlPlaneRealtimeCursorOptions | undefined): number {
  return validSequence(options?.initialSequence ?? 0);
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function invalidBatch(): ControlPlaneRealtimeProtocolError {
  return new ControlPlaneRealtimeProtocolError(ControlPlaneRealtimeProtocolErrorCode.InvalidBatch);
}
