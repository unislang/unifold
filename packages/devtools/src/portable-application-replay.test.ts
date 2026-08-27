import type { JsonObject, UiMachineDefinition } from "@unislang/unifold-contracts";
import { UiCommandType, type UiEvent, type UiNodeSnapshot } from "@unislang/unifold-events";
import { UnifoldRuntime, type UnifoldRuntimeStatus } from "@unislang/unifold-runtime";
import {
  createMachineCommandRegistry,
  createUiMachineActor,
  type UiMachineActor
} from "@unislang/unifold-xstate";
import type { AnySchema } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";

import {
  createPortableReplayControlPort,
  createPortableReplayEffectPort,
  type DevtoolsMockEffect,
  type DevtoolsPortableReplayControlPort,
  type DevtoolsPortableReplayControls,
  type DevtoolsPortableReplayEffectPort
} from "./portable-application-replay.js";

interface PortableReplayFixture {
  readonly controls: DevtoolsPortableReplayControls;
  readonly document: { readonly revision: string };
  readonly events: readonly UiEvent[];
  readonly expected: ReplayResult;
  readonly initialSnapshots: readonly UiNodeSnapshot[];
  readonly machines: readonly UiMachineDefinition[];
  readonly mockedEffects: readonly DevtoolsMockEffect[];
}

interface ReplayResult {
  readonly consumed: JsonObject;
  readonly documentRevision: string;
  readonly effectReceipts: readonly JsonObject[];
  readonly events: readonly (readonly (number | string)[])[];
  readonly machineStates: Readonly<Record<string, unknown>>;
  readonly machineVersions: Readonly<Record<string, string>>;
  readonly runtimeRevision: number;
  readonly runtimeStatus: UnifoldRuntimeStatus;
  readonly snapshots: readonly UiNodeSnapshot[];
}

it("replays one portable application record identically through runtime and XState", async () => {
  const fixture = await loadFixture();
  const first = runReplay(fixture);
  const second = runReplay(fixture);

  expect(first).toEqual(fixture.expected);
  expect(second).toEqual(first);
});

it("detects machine, snapshot, and event drift against the portable oracle", async () => {
  const fixture = await loadFixture();
  const machineDrift = withMachineVersion(fixture, "1.0.1");
  const snapshotDrift = withSnapshotLabel(fixture, "Drifted profile");
  const eventDrift = withEventType(fixture, "org.unifold.ui.unregistered.v1");

  expect(runReplay(machineDrift)).not.toEqual(fixture.expected);
  expect(runReplay(snapshotDrift)).not.toEqual(fixture.expected);
  expect(runReplay(eventDrift)).not.toEqual(fixture.expected);
});

it("validates the bounded record and rejects undeclared replay authority", async () => {
  const fixture = await fixtureJson();
  const schema = await jsonFile("../schemas/portable-application-replay.schema.json");
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema as AnySchema);

  expect(validate(fixture)).toBe(true);
  expect(validate({ ...fixture, network: "allowed" })).toBe(false);
  expect(validate({ ...fixture, controls: { clock: [], randomness: [] } })).toBe(false);
});

it("fails closed when deterministic controls or mocked receipts drift", () => {
  const controls = createPortableReplayControlPort({ clock: ["time-1"], randomness: ["id-1"] });
  expect(controls.now()).toBe("time-1");
  expect(controls.random()).toBe("id-1");
  expect(() => controls.now()).toThrow("exhausted clock");
  const effects = createPortableReplayEffectPort([
    { capability: "allowed", input: { a: 1, b: 2 }, outcome: "completed", receipt: {} }
  ]);
  effects.execute(
    {
      capability: "allowed",
      input: { b: 2, a: 1 },
      type: UiCommandType.EffectInvoke
    },
    executionContext()
  );
  expect(effects.receipts).toHaveLength(1);
  expect(() =>
    effects.execute(
      { capability: "other", input: {}, type: UiCommandType.EffectInvoke },
      executionContext()
    )
  ).toThrow("exhausted mocked effect");
});

function executionContext() {
  return { causationId: "effect", correlationId: "replay", transactionId: "effect-1" };
}

function runReplay(fixture: PortableReplayFixture): ReplayResult {
  const sequences = createPortableReplayControlPort(fixture.controls);
  const effects = createPortableReplayEffectPort(fixture.mockedEffects);
  const runtime = replayRuntime(fixture, sequences, effects);
  const emitted: UiEvent[] = [];
  const subscription = runtime.events$.subscribe((event) => emitted.push(event));
  const actors = replayActors(fixture, runtime);
  fixture.events.forEach((event) => runtime.ingestIntent(event));
  const machineStates = actorValues(actors);
  stopActors(actors);
  runtime.dispose();
  subscription.unsubscribe();
  return replayResult(fixture, runtime, sequences, effects, emitted, machineStates);
}

function replayRuntime(
  fixture: PortableReplayFixture,
  sequences: DevtoolsPortableReplayControlPort,
  commandPort: DevtoolsPortableReplayEffectPort
): UnifoldRuntime {
  return new UnifoldRuntime({
    commandPort,
    createId: () => sequences.random(),
    documentId: "portable-profile-workflow",
    initialNodes: fixture.initialSnapshots,
    now: () => sequences.now()
  });
}

function replayActors(
  fixture: PortableReplayFixture,
  runtime: UnifoldRuntime
): readonly RegisteredActor[] {
  const commands = replayCommands(fixture.mockedEffects[0]);
  return fixture.machines.map((definition) => {
    const actor = createUiMachineActor(definition, commands, (batch, cause) => {
      runtime.execute(batch, {
        causationId: cause.id,
        correlationId: cause.correlationid
      });
    });
    actor.start();
    return { actor, unregister: runtime.registerActor(definition.ownerId, actor) };
  });
}

function replayCommands(effect: DevtoolsMockEffect | undefined) {
  if (effect === undefined) throw new Error("Portable replay requires the mocked effect.");
  const registry = createMachineCommandRegistry();
  registry.register("mark-saved", () => ({
    id: "profile",
    properties: { status: "saved" },
    type: UiCommandType.NodePatchProperties
  }));
  registry.register("persist-profile", () => ({
    capability: effect.capability,
    input: effect.input,
    type: UiCommandType.EffectInvoke
  }));
  return registry;
}

function replayResult(
  fixture: PortableReplayFixture,
  runtime: UnifoldRuntime,
  sequences: DevtoolsPortableReplayControlPort,
  effects: DevtoolsPortableReplayEffectPort,
  events: readonly UiEvent[],
  machineStates: Readonly<Record<string, unknown>>
): ReplayResult {
  return {
    consumed: {
      clock: sequences.clockCount,
      events: fixture.events.length,
      mockedEffects: effects.count,
      randomness: sequences.randomCount
    },
    documentRevision: fixture.document.revision,
    effectReceipts: effects.receipts,
    events: events.map(eventProjection),
    machineStates,
    machineVersions: Object.fromEntries(fixture.machines.map(({ id, version }) => [id, version])),
    runtimeRevision: runtime.revision,
    runtimeStatus: runtime.status,
    snapshots: fixture.initialSnapshots.map(({ id }) => runtime.getSnapshot(id))
  };
}

function eventProjection(event: UiEvent): readonly (number | string)[] {
  return [
    event.id,
    event.time,
    event.type,
    event.sequence,
    event.staterevision,
    event.transactionid
  ];
}

interface RegisteredActor {
  readonly actor: UiMachineActor;
  readonly unregister: () => void;
}

function actorValues(actors: readonly RegisteredActor[]): Readonly<Record<string, unknown>> {
  return Object.fromEntries(actors.map(({ actor }) => [actor.definition.id, actor.state]));
}

function stopActors(actors: readonly RegisteredActor[]): void {
  actors.forEach(({ actor, unregister }) => {
    unregister();
    actor.stop();
  });
}

function take<T>(values: readonly T[], index: number, name: string): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Portable replay exhausted ${name} controls.`);
  return value;
}

async function loadFixture(): Promise<PortableReplayFixture> {
  return (await fixtureJson()) as unknown as PortableReplayFixture;
}

async function fixtureJson(): Promise<Record<string, unknown>> {
  return (await jsonFile("../fixtures/portable-application-replay.json")) as Record<
    string,
    unknown
  >;
}

async function jsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8")) as unknown;
}

function withMachineVersion(
  fixture: PortableReplayFixture,
  version: string
): PortableReplayFixture {
  const machine = take(fixture.machines, 0, "machine");
  return { ...fixture, machines: [{ ...machine, version }] };
}

function withSnapshotLabel(fixture: PortableReplayFixture, label: string): PortableReplayFixture {
  const snapshot = take(fixture.initialSnapshots, 0, "snapshot");
  return {
    ...fixture,
    initialSnapshots: [{ ...snapshot, properties: { ...snapshot.properties, label } }]
  };
}

function withEventType(fixture: PortableReplayFixture, type: string): PortableReplayFixture {
  const event = take(fixture.events, 0, "event");
  return { ...fixture, events: [{ ...event, type }] };
}
