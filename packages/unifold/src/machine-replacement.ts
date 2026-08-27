import type { UiMachineActor } from "@unislang/unifold-xstate";

export interface UiMachineRecord {
  readonly actor: UiMachineActor;
  readonly key: string;
  readonly unregister: () => void;
}

export class UiMachineReplacement {
  private active = true;
  private activated = false;

  constructor(
    private readonly previous: ReadonlyMap<string, UiMachineRecord>,
    private readonly next: ReadonlyMap<string, UiMachineRecord>,
    private readonly installRecords: (records: ReadonlyMap<string, UiMachineRecord>) => void
  ) {}

  activate(): void {
    this.assertActive();
    this.installRecords(this.next);
    this.activated = true;
    obsoleteRecords(this.previous, this.next).forEach(unregisterRecord);
  }

  commit(): void {
    this.assertActive();
    obsoleteRecords(this.previous, this.next).forEach(stopActorSafely);
    this.active = false;
  }

  discard(): void {
    if (!this.active) return;
    if (this.activated) this.installRecords(this.previous);
    candidateRecords(this.previous, this.next).forEach(stopRecordSafely);
    this.active = false;
  }

  private assertActive(): void {
    if (!this.active) throw new Error("Machine replacement is closed.");
  }
}

function obsoleteRecords(
  previous: ReadonlyMap<string, UiMachineRecord>,
  next: ReadonlyMap<string, UiMachineRecord>
): readonly UiMachineRecord[] {
  return [...previous].flatMap(([id, record]) => (next.get(id) === record ? [] : [record]));
}

function candidateRecords(
  previous: ReadonlyMap<string, UiMachineRecord>,
  next: ReadonlyMap<string, UiMachineRecord>
): readonly UiMachineRecord[] {
  return [...next].flatMap(([id, record]) => (previous.get(id) === record ? [] : [record]));
}

function unregisterRecord(record: UiMachineRecord): void {
  record.unregister();
}

function stopRecordSafely(record: UiMachineRecord): void {
  try {
    record.unregister();
  } finally {
    stopActorSafely(record);
  }
}

function stopActorSafely(record: UiMachineRecord): void {
  try {
    record.actor.stop();
  } catch {
    // Obsolete adapter cleanup cannot invalidate an activated replacement.
  }
}
