import type { JsonValue, UiMachineDefinition } from "@unislang/unifold-contracts";
import type { UiCommand, UiEvent } from "@unislang/unifold-events";
import type { UnifoldRuntime } from "@unislang/unifold-runtime";
import {
  createUiMachineActor,
  type UiMachineActor,
  type UiMachineCommandRegistry
} from "@unislang/unifold-xstate";

interface MachineRecord {
  readonly actor: UiMachineActor;
  readonly key: string;
  readonly unregister: () => void;
}

export class UiMachineConfigurationError extends Error {}

export class UiMachineCoordinator {
  private records = new Map<string, MachineRecord>();

  constructor(
    private readonly runtime: UnifoldRuntime,
    private readonly registry: UiMachineCommandRegistry
  ) {}

  validate(definitions: readonly UiMachineDefinition[]): void {
    try {
      definitions.forEach((definition) => this.createActor(definition));
    } catch (error) {
      throw new UiMachineConfigurationError(errorMessage(error));
    }
  }

  replace(definitions: readonly UiMachineDefinition[]): void {
    const next = new Map<string, MachineRecord>();
    definitions.forEach((definition) => next.set(definition.id, this.nextRecord(definition)));
    this.records.forEach((record, id) => {
      if (next.get(id) !== record) stopRecord(record);
    });
    this.records = next;
  }

  state(id: string): JsonValue {
    const record = this.records.get(id);
    if (record === undefined) throw new Error(`Unknown machine: ${id}.`);
    return record.actor.state;
  }

  dispose(): void {
    this.records.forEach(stopRecord);
    this.records.clear();
  }

  private nextRecord(definition: UiMachineDefinition): MachineRecord {
    const key = JSON.stringify(definition);
    const current = this.records.get(definition.id);
    if (current?.key === key) return current;
    const actor = this.createActor(definition);
    const unregister = this.runtime.registerActor(definition.ownerId, actor);
    actor.start();
    return { actor, key, unregister };
  }

  private createActor(definition: UiMachineDefinition): UiMachineActor {
    return createUiMachineActor(definition, this.registry, (command, cause) =>
      executeCausedCommand(this.runtime, command, cause)
    );
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Invalid machine configuration.";
}

function executeCausedCommand(runtime: UnifoldRuntime, command: UiCommand, cause: UiEvent): void {
  runtime.execute([command], {
    causationId: cause.id,
    correlationId: cause.correlationid
  });
}

function stopRecord(record: MachineRecord): void {
  record.unregister();
  record.actor.stop();
}
