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

interface StagedMachineRecord {
  readonly actor: UiMachineActor;
  readonly bindings: Readonly<Record<string, UiNodeEventBindings>>;
  readonly key: string;
  readonly ownerId: string;
}

interface MachineCandidate {
  readonly id: string;
  readonly retained?: MachineRecord;
  readonly staged?: StagedMachineRecord;
}

interface UiMachineActorRegistrar {
  registerActor(id: string, actor: UiActorRef): () => void;
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
    nodes: Readonly<Record<string, UnifoldIrNode>>,
    registrar: UiMachineActorRegistrar = this.runtime
  ): void {
    const candidates = this.stageCandidates(definitions, nodes);
    const next = this.registerCandidates(candidates, registrar);
    const previous = this.records;
    this.records = next;
    try {
      stopObsoleteRecords(previous, next);
    } catch (error) {
      throw configurationError(error);
    }
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

  private stageCandidates(
    definitions: readonly UiMachineDefinition[],
    nodes: Readonly<Record<string, UnifoldIrNode>>
  ): readonly MachineCandidate[] {
    const candidates: MachineCandidate[] = [];
    try {
      requireUniqueMachineIds(definitions);
      definitions.forEach((definition) => candidates.push(this.stageCandidate(definition, nodes)));
      return candidates;
    } catch (error) {
      stopCandidateActors(candidates);
      throw configurationError(error);
    }
  }

  private stageCandidate(
    definition: UiMachineDefinition,
    nodes: Readonly<Record<string, UnifoldIrNode>>
  ): MachineCandidate {
    const bindings = bindingsForOwner(definition.ownerId, nodes);
    const key = JSON.stringify([definition, bindings]);
    const current = this.records.get(definition.id);
    if (current?.key === key) return { id: definition.id, retained: current };
    const actor = this.createStartedActor(definition);
    return {
      id: definition.id,
      staged: { actor, bindings, key, ownerId: definition.ownerId }
    };
  }

  private registerCandidates(
    candidates: readonly MachineCandidate[],
    registrar: UiMachineActorRegistrar
  ): Map<string, MachineRecord> {
    const next = new Map<string, MachineRecord>();
    const registered: MachineRecord[] = [];
    const pending = new Set(candidates.flatMap(candidateActor));
    try {
      candidates.forEach((candidate) =>
        next.set(candidate.id, this.registerCandidate(candidate, registered, pending, registrar))
      );
      return next;
    } catch (error) {
      registered.forEach(safelyStopRecord);
      pending.forEach(safelyStopActor);
      throw configurationError(error);
    }
  }

  private registerCandidate(
    candidate: MachineCandidate,
    registered: MachineRecord[],
    pending: Set<UiMachineActor>,
    registrar: UiMachineActorRegistrar
  ): MachineRecord {
    if (candidate.retained !== undefined) return candidate.retained;
    const staged = requireStagedRecord(candidate);
    const unregister = registrar.registerActor(
      staged.ownerId,
      bindingActor(staged.actor, staged.bindings)
    );
    const record = { actor: staged.actor, key: staged.key, unregister };
    registered.push(record);
    pending.delete(staged.actor);
    return record;
  }

  private createActor(definition: UiMachineDefinition): UiMachineActor {
    return createUiMachineActor(
      definition,
      this.registry,
      (commands, cause) => executeCausedCommands(this.runtime, commands, cause, definition.ownerId),
      this.guards,
      (id) => runtimeSnapshot(this.runtime, id)
    );
  }

  private createStartedActor(definition: UiMachineDefinition): UiMachineActor {
    const actor = this.createActor(definition);
    startMachineActor(actor);
    return actor;
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

function configurationError(error: unknown): UiMachineConfigurationError {
  if (error instanceof UiMachineConfigurationError) return error;
  return new UiMachineConfigurationError(errorMessage(error));
}

function requireUniqueMachineIds(definitions: readonly UiMachineDefinition[]): void {
  const ids = definitions.map(({ id }) => id);
  if (new Set(ids).size === ids.length) return;
  throw new UiMachineConfigurationError("Machine definitions must have unique IDs.");
}

function candidateActor(candidate: MachineCandidate): readonly UiMachineActor[] {
  return candidate.staged === undefined ? [] : [candidate.staged.actor];
}

function requireStagedRecord(candidate: MachineCandidate): StagedMachineRecord {
  if (candidate.staged !== undefined) return candidate.staged;
  throw new UiMachineConfigurationError(`Machine candidate is incomplete: ${candidate.id}.`);
}

function stopCandidateActors(candidates: readonly MachineCandidate[]): void {
  candidates.flatMap(candidateActor).forEach(safelyStopActor);
}

function stopObsoleteRecords(
  previous: ReadonlyMap<string, MachineRecord>,
  next: ReadonlyMap<string, MachineRecord>
): void {
  const failures: unknown[] = [];
  previous.forEach((record, id) => stopObsoleteRecord(record, next.get(id), failures));
  if (failures[0] !== undefined) throw failures[0];
}

function stopObsoleteRecord(
  previous: MachineRecord,
  next: MachineRecord | undefined,
  failures: unknown[]
): void {
  if (previous === next) return;
  try {
    stopRecord(previous);
  } catch (error) {
    failures.push(error);
  }
}

function executeCausedCommands(
  runtime: UnifoldRuntime,
  commands: readonly UiCommand[],
  cause: UiEvent,
  effectSourceId: string
): void {
  runtime.execute(commands, {
    causationId: cause.id,
    correlationId: cause.correlationid,
    effectSourceId
  });
}

function stopRecord(record: MachineRecord): void {
  try {
    record.unregister();
  } finally {
    record.actor.stop();
  }
}

function safelyStopRecord(record: MachineRecord): void {
  try {
    stopRecord(record);
  } catch {
    // Preserve the replacement failure while attempting every staged cleanup.
  }
}

function safelyStopActor(actor: UiMachineActor): void {
  try {
    actor.stop();
  } catch {
    // Preserve the replacement failure while attempting every staged cleanup.
  }
}

function startMachineActor(actor: UiMachineActor): void {
  try {
    actor.start();
  } catch (error) {
    safelyStopActor(actor);
    throw error;
  }
}
