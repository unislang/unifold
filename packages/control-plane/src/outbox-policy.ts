import type {
  ControlPlaneOutboxAcknowledgeCommand,
  ControlPlaneOutboxLeaseCommand,
  ControlPlaneOutboxReleaseCommand
} from "./ports.js";

export function requireOutboxLeaseCommand(command: ControlPlaneOutboxLeaseCommand): void {
  const valid = [
    validIdentity(command.tenantId),
    validIdentity(command.workerId),
    validInstant(command.leasedAt),
    validInstant(command.leaseUntil),
    Date.parse(command.leaseUntil) > Date.parse(command.leasedAt),
    validLimit(command.limit)
  ].every(Boolean);
  if (!valid) invalid();
}

export function requireOutboxAcknowledgeCommand(
  command: ControlPlaneOutboxAcknowledgeCommand
): void {
  requireMutationBase(command.tenantId, command.workerId, command.sequences);
  if (!validInstant(command.acknowledgedAt)) invalid();
}

export function requireOutboxReleaseCommand(command: ControlPlaneOutboxReleaseCommand): void {
  requireMutationBase(command.tenantId, command.workerId, command.sequences);
  if (!validInstant(command.availableAt)) invalid();
}

function requireMutationBase(
  tenantId: string,
  workerId: string,
  sequences: readonly number[]
): void {
  const valid = [
    validIdentity(tenantId),
    validIdentity(workerId),
    validSequenceCount(sequences),
    sequences.every(validSequence),
    new Set(sequences).size === sequences.length
  ].every(Boolean);
  if (!valid) invalid();
}

function validIdentity(value: string): boolean {
  return [value.length > 0, value.length <= 256, value.trim() === value].every(Boolean);
}

function validLimit(value: number): boolean {
  return [Number.isSafeInteger(value), value >= 1, value <= 100].every(Boolean);
}

function validSequenceCount(values: readonly number[]): boolean {
  return [values.length >= 1, values.length <= 100].every(Boolean);
}

function validInstant(value: string): boolean {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return false;
  return new Date(milliseconds).toISOString() === value;
}

function validSequence(value: number): boolean {
  return [Number.isSafeInteger(value), value > 0].every(Boolean);
}

function invalid(): never {
  throw new TypeError("Invalid control-plane outbox command.");
}
