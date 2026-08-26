import {
  UiComponentEventBinding,
  type JsonValue,
  type UiMachineDefinition,
  type UiNodeEventBindings
} from "@unislang/unifold-contracts";
import { ElementEventType } from "@unislang/unifold-elements";
import type { UiCommand, UiEvent } from "@unislang/unifold-events";
import type { UnifoldIrNode } from "@unislang/unifold-ir";
import type { UnifoldRuntime } from "@unislang/unifold-runtime";
import {
  createMachineCommandRegistry,
  createUiMachineActor,
  type UiActorRef,
  type UiMachineActor,
  type UiMachineCommandRegistry,
  type UiMachineGuardRegistry,
  type UiXStateEvent
} from "@unislang/unifold-xstate";

interface MachineRecord {
  readonly actor: UiMachineActor;
  readonly key: string;
  readonly unregister: () => void;
}

const BINDING_BY_EVENT_TYPE: Readonly<Record<string, UiComponentEventBinding>> = {
  [ElementEventType.ComponentActivated]: UiComponentEventBinding.Activated,
  [ElementEventType.ControlBlurred]: UiComponentEventBinding.Blurred,
  [ElementEventType.ControlInput]: UiComponentEventBinding.Input,
  [ElementEventType.FormResetRequested]: UiComponentEventBinding.ResetRequested,
  [ElementEventType.FormSubmitRequested]: UiComponentEventBinding.SubmitRequested,
  [ElementEventType.FormSubmitted]: UiComponentEventBinding.Submitted
};

export class UiMachineConfigurationError extends Error {}

export class UiMachineCoordinator {
  private records = new Map<string, MachineRecord>();

  constructor(
    private readonly runtime: UnifoldRuntime,
    private readonly registry: UiMachineCommandRegistry,
    private readonly guards?: UiMachineGuardRegistry
  ) {}

  validate(definitions: readonly UiMachineDefinition[]): void {
    try {
      definitions.forEach((definition) => this.createActor(definition));
    } catch (error) {
      throw new UiMachineConfigurationError(errorMessage(error));
    }
  }

  replace(
    definitions: readonly UiMachineDefinition[],
    nodes: Readonly<Record<string, UnifoldIrNode>>
  ): void {
    const next = new Map<string, MachineRecord>();
    definitions.forEach((definition) =>
      next.set(definition.id, this.nextRecord(definition, nodes))
    );
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

  private nextRecord(
    definition: UiMachineDefinition,
    nodes: Readonly<Record<string, UnifoldIrNode>>
  ): MachineRecord {
    const bindings = bindingsForOwner(definition.ownerId, nodes);
    const key = JSON.stringify([definition, bindings]);
    const current = this.records.get(definition.id);
    if (current?.key === key) return current;
    const actor = this.createActor(definition);
    const unregister = this.runtime.registerActor(
      definition.ownerId,
      bindingActor(actor, bindings)
    );
    actor.start();
    return { actor, key, unregister };
  }

  private createActor(definition: UiMachineDefinition): UiMachineActor {
    return createUiMachineActor(
      definition,
      this.registry,
      (command, cause) => executeCausedCommand(this.runtime, command, cause),
      this.guards,
      (id) => runtimeSnapshot(this.runtime, id)
    );
  }
}

export function createUiMachineCoordinator(
  runtime: UnifoldRuntime,
  commands?: UiMachineCommandRegistry,
  guards?: UiMachineGuardRegistry
): UiMachineCoordinator {
  return new UiMachineCoordinator(runtime, commands ?? createMachineCommandRegistry(), guards);
}

function runtimeSnapshot(runtime: UnifoldRuntime, id: string) {
  try {
    return runtime.getSnapshot(id);
  } catch {
    return undefined;
  }
}

function bindingsForOwner(
  ownerId: string,
  nodes: Readonly<Record<string, UnifoldIrNode>>
): Readonly<Record<string, UiNodeEventBindings>> {
  const entries = Object.values(nodes)
    .filter(
      ({ eventBindings, scopePath }) =>
        scopePath.includes(ownerId) && Object.keys(eventBindings).length > 0
    )
    .map(({ eventBindings, id }) => [id, eventBindings] as const)
    .sort(([left], [right]) => left.localeCompare(right));
  return Object.fromEntries(entries);
}

function bindingActor(
  actor: UiActorRef,
  bindings: Readonly<Record<string, UiNodeEventBindings>>
): UiActorRef {
  return { send: (event) => actor.send(boundEvent(event, bindings)) };
}

function boundEvent(
  event: UiXStateEvent,
  bindings: Readonly<Record<string, UiNodeEventBindings>>
): UiXStateEvent {
  const type = boundEventType(event, bindings);
  return type === undefined ? event : { ...event, type };
}

function boundEventType(
  event: UiXStateEvent,
  bindings: Readonly<Record<string, UiNodeEventBindings>>
): string | undefined {
  const sourceId = sourceNodeId(event);
  if (sourceId === undefined) return undefined;
  const binding = BINDING_BY_EVENT_TYPE[event.type];
  if (binding === undefined) return undefined;
  return nodeBinding(bindings[sourceId], binding);
}

function sourceNodeId(event: UiXStateEvent): string | undefined {
  const source = event.uiEvent.data.sourceNode;
  return source === undefined ? undefined : source.id;
}

function nodeBinding(
  bindings: UiNodeEventBindings | undefined,
  binding: UiComponentEventBinding
): string | undefined {
  if (bindings === undefined) return undefined;
  return bindings[binding];
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
