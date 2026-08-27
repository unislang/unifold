// @vitest-environment happy-dom
import {
  DataClassification,
  UiStoreAccess,
  UiStoreInitialDataPolicy,
  UiStoreOwnership,
  UiStorePersistence,
  UiStoreSchemaVersion,
  UiStoreSourceKind
} from "@unislang/unifold-contracts";
import { UiCommandType, UiEventDisclosureMode } from "@unislang/unifold-events";
import type { UiCommand, UiEvent } from "@unislang/unifold-events";
import { defineUnifoldElements } from "@unislang/unifold-elements";
import type { UiXStateEvent } from "@unislang/unifold-xstate";
import { beforeAll, expect, it, vi } from "vitest";

import {
  createUnifoldApplicationObserver,
  UnifoldApplicationObservationError,
  type UnifoldApplicationObservation
} from "./application-observer.js";
import { authoredDocument, requireApplication } from "./application.test-data.js";
import { mountUnifoldApplication } from "./mount.js";
import type { UnifoldApplicationPort } from "./types.js";

beforeAll(() => defineUnifoldElements());

it("observes separately authorized applications without crossing runtime authority", () => {
  const first = mountedApplication("first", "alpha", DataClassification.Public);
  const second = mountedApplication("second", "beta", DataClassification.Internal);
  const allowed = new Set(["tenant-a"]);
  const observations: UnifoldApplicationObservation[] = [];
  const observer = createUnifoldApplicationObserver(
    [
      target("application-a", "tenant-a", first.application),
      target("application-b", "tenant-b", second.application)
    ],
    { authorize: ({ tenantId }) => allowed.has(tenantId) }
  );
  observer.events$.subscribe((observation) => observations.push(observation));
  exerciseApplications(first, second);
  verifyFirstObservation(observations, first);
  allowed.add("tenant-b");
  second.application.runtime.execute([valueCommand("beta-authorized")]);
  verifySecondObservation(observations.at(-1), second);
  verifyDisposal(observer, first.application, second.application, observations);
});

it("rejects missing, duplicate, oversized, and unsafe observation identities", () => {
  const mounted = mountedApplication("only", "value", DataClassification.Public);
  const targetValue = target("application", "tenant", mounted.application);
  expect(() => createUnifoldApplicationObserver([], allowAll())).toThrow(
    UnifoldApplicationObservationError
  );
  expect(() => createUnifoldApplicationObserver([targetValue, targetValue], allowAll())).toThrow(
    "unique"
  );
  expect(() =>
    createUnifoldApplicationObserver(
      [targetValue, target("other-application", "other-tenant", mounted.application)],
      allowAll()
    )
  ).toThrow("runtimes must be unique");
  expect(() =>
    createUnifoldApplicationObserver(
      Array.from({ length: 65 }, () => targetValue),
      allowAll()
    )
  ).toThrow("1-64");
  expect(() =>
    createUnifoldApplicationObserver(
      [target("application", "tenant/escape", mounted.application)],
      allowAll()
    )
  ).toThrow("Invalid tenant");
  mounted.application.dispose();
});

it("fails closed when observation authorization throws", () => {
  const mounted = mountedApplication("failure", "value", DataClassification.Public);
  const observations: UnifoldApplicationObservation[] = [];
  const observer = createUnifoldApplicationObserver(
    [target("application", "tenant", mounted.application)],
    {
      authorize: () => {
        throw new Error("policy unavailable");
      }
    }
  );
  observer.events$.subscribe((observation) => observations.push(observation));
  mounted.application.runtime.execute([valueCommand("changed")]);
  expect(observations).toEqual([]);
  observer.dispose();
  mounted.application.dispose();
});

interface MountedFixture {
  readonly application: UnifoldApplicationPort;
  readonly effects: ReturnType<typeof vi.fn<(command: UiCommand) => void>>;
  readonly actor: ReturnType<typeof vi.fn<(event: UiXStateEvent) => void>>;
  readonly idPrefix: string;
}

function mountedApplication(
  idPrefix: string,
  value: string,
  classification: DataClassification
): MountedFixture {
  let eventId = 0;
  const effects = vi.fn<(command: UiCommand) => void>();
  const document = classifiedDocument(idPrefix, value, classification);
  const application = requireApplication(
    mountUnifoldApplication(document, documentElement(), {
      runtime: {
        commandPort: { execute: effects },
        createId: () => `${idPrefix}-${++eventId}`,
        now: () => "2026-08-27T00:00:00.000Z",
        source: `urn:test:${idPrefix}`
      },
      storeAdapters: {
        state: { load: () => ({ name: value }), version: "2.0.0", write: vi.fn() }
      }
    })
  );
  const actor = vi.fn<(event: UiXStateEvent) => void>();
  application.runtime.registerActor("name", { send: actor });
  return { actor, application, effects, idPrefix };
}

function classifiedDocument(id: string, value: string, classification: DataClassification) {
  const document = authoredDocument("1", { value });
  return {
    ...document,
    id,
    stores: classificationStore(classification),
    view: { $comp: "TextField", id: "name", label: "Name", path: "/name", store: "state" }
  };
}

function classificationStore(classification: DataClassification) {
  return [
    {
      access: UiStoreAccess.ReadWriteDraft,
      classification,
      id: "state",
      initialData: UiStoreInitialDataPolicy.Required,
      maxBytes: 1024,
      migrations: { maximum: "2.9.0", minimum: "2.0.0" },
      ownership: UiStoreOwnership.Host,
      persistence: UiStorePersistence.Session,
      schema: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        additionalProperties: false,
        properties: { name: { type: "string" } },
        required: ["name"],
        type: "object"
      },
      schemaVersion: UiStoreSchemaVersion.Version1,
      source: { kind: UiStoreSourceKind.Host }
    }
  ];
}

function exerciseApplications(first: MountedFixture, second: MountedFixture): void {
  first.application.runtime.execute([valueCommand("alpha-updated"), effectCommand("first")]);
  second.application.runtime.execute([valueCommand("beta-hidden"), effectCommand("second")]);
  expect(first.application.runtime.getSnapshot("name").control?.value).toBe("alpha-updated");
  expect(second.application.runtime.getSnapshot("name").control?.value).toBe("beta-hidden");
  expect(first.effects).toHaveBeenCalledTimes(1);
  expect(second.effects).toHaveBeenCalledTimes(1);
  expect(first.actor).not.toHaveBeenCalledWith(
    expect.objectContaining({ source: "urn:test:second" })
  );
  expect(second.actor).not.toHaveBeenCalledWith(
    expect.objectContaining({ source: "urn:test:first" })
  );
}

function verifyFirstObservation(
  observations: readonly UnifoldApplicationObservation[],
  first: MountedFixture
): void {
  expect(observations.length).toBeGreaterThan(0);
  expect(
    observations.every(
      ({ applicationId, tenantId }) => applicationId === "application-a" && tenantId === "tenant-a"
    )
  ).toBe(true);
  expect(observations.every(({ event }) => event.id.startsWith(`${first.idPrefix}-`))).toBe(true);
  expect(observations.every(({ event }) => event.source === "urn:test:first")).toBe(true);
}

function verifySecondObservation(
  observation: UnifoldApplicationObservation | undefined,
  second: MountedFixture
): void {
  expect(observation).toMatchObject({ applicationId: "application-b", tenantId: "tenant-b" });
  verifyRedactedEvent(observation?.event, second.idPrefix);
  expect(Object.keys(observation ?? {})).toEqual(["applicationId", "tenantId", "event"]);
}

function verifyRedactedEvent(event: UiEvent | undefined, idPrefix: string): void {
  const observed = requireEvent(event);
  expect(observed.id).toMatch(new RegExp(`^${idPrefix}-`, "u"));
  expect(observed.data.disclosure).toMatchObject({ mode: UiEventDisclosureMode.MetadataOnly });
  expect(observed.data.snapshot).toBeUndefined();
}

function requireEvent(event: UiEvent | undefined): UiEvent {
  expect(event).toBeDefined();
  if (event === undefined) throw new Error("Expected an authorized observation event.");
  return event;
}

function verifyDisposal(
  observer: { dispose(): void },
  first: UnifoldApplicationPort,
  second: UnifoldApplicationPort,
  observations: UnifoldApplicationObservation[]
): void {
  first.dispose();
  const count = observations.length;
  second.runtime.execute([valueCommand("still-active")]);
  expect(observations.length).toBeGreaterThan(count);
  observer.dispose();
  const disposedCount = observations.length;
  second.runtime.execute([valueCommand("observer-disposed")]);
  expect(observations).toHaveLength(disposedCount);
  second.dispose();
}

function target(applicationId: string, tenantId: string, application: UnifoldApplicationPort) {
  return { application, applicationId, tenantId };
}

function valueCommand(value: string) {
  return { id: "name", type: UiCommandType.ControlSetValue, value } as const;
}

function effectCommand(capability: string) {
  return { capability, input: {}, type: UiCommandType.EffectInvoke } as const;
}

function documentElement(): HTMLElement {
  return document.createElement("div");
}

function allowAll() {
  return { authorize: () => true };
}
