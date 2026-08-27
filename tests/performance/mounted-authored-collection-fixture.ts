import { UiCollectionOperationType } from "@unislang/unifold-contracts";
import {
  UnifoldApplicationMountStatus,
  UnifoldApplicationUpdateStatus,
  mountUnifoldApplication,
  type UnifoldApplicationPort
} from "@unislang/unifold";

import { createAuthoredCollectionDocument } from "./authored-collection-fixture.js";
import { percentile } from "./profile-statistics.js";

const ITEM_COUNT = 500;
const MUTATION_P95_LIMIT_MILLISECONDS = 250;
const PROFILE_SAMPLES = 20;

interface MountedCollectionHarness {
  readonly application: UnifoldApplicationPort;
  readonly container: HTMLElement;
  insertedKey: string | undefined;
  revision: number;
}

export function createMountedCollectionHarness(): MountedCollectionHarness {
  const container = document.createElement("div");
  document.body.append(container);
  const result = mountUnifoldApplication(createAuthoredCollectionDocument(), container);
  if (result.status !== UnifoldApplicationMountStatus.Mounted) {
    container.remove();
    throw new Error("Authored collection performance application failed to mount.");
  }
  return { application: result.application, container, insertedKey: undefined, revision: 1 };
}

export function mutateMountedCollection(harness: MountedCollectionHarness): void {
  const currentRevision = String(harness.revision);
  harness.revision += 1;
  const nextRevision = String(harness.revision);
  const result = applyMutation(harness, currentRevision, nextRevision);
  if (result.status !== UnifoldApplicationUpdateStatus.Applied) {
    throw new Error("Authored collection performance mutation was rejected.");
  }
  assertExactMountedState(harness);
}

function applyMutation(
  harness: MountedCollectionHarness,
  expectedRevision: string,
  revision: string
) {
  if (harness.insertedKey === undefined) return insertItem(harness, expectedRevision, revision);
  return removeItem(harness, expectedRevision, revision);
}

function assertExactMountedState(harness: MountedCollectionHarness): void {
  if (hasExactMountedState(harness)) return;
  throw new Error("Authored collection performance mutation drifted from canonical state.");
}

export function disposeMountedCollection(harness: MountedCollectionHarness): void {
  harness.application.dispose();
  harness.container.remove();
}

export function measureMountedCollectionMutation(sampleCount = PROFILE_SAMPLES) {
  const harness = createMountedCollectionHarness();
  try {
    mutateMountedCollection(harness);
    mutateMountedCollection(harness);
    const samples = Array.from({ length: sampleCount }, () => timedMutation(harness));
    const p95Milliseconds = percentile(samples, 0.95);
    const exact = hasExactMountedState(harness);
    return {
      gate: {
        actualP95Milliseconds: p95Milliseconds,
        exact,
        limitP95Milliseconds: MUTATION_P95_LIMIT_MILLISECONDS,
        name: "500-item mounted authored collection mutation",
        passed: exact && p95Milliseconds <= MUTATION_P95_LIMIT_MILLISECONDS
      },
      itemCount: ITEM_COUNT,
      p50Milliseconds: percentile(samples, 0.5),
      p95Milliseconds,
      p99Milliseconds: percentile(samples, 0.99),
      sampleCount
    };
  } finally {
    disposeMountedCollection(harness);
  }
}

function timedMutation(harness: MountedCollectionHarness): number {
  const started = performance.now();
  mutateMountedCollection(harness);
  return performance.now() - started;
}

function insertItem(harness: MountedCollectionHarness, expectedRevision: string, revision: string) {
  const key = `profile/${String(harness.revision).padStart(5, "0")}::item`;
  harness.insertedKey = key;
  return harness.application.applyCollectionOperation({
    collectionId: "items",
    expectedRevision,
    index: ITEM_COUNT,
    item: { id: key, label: `Profile ${harness.revision}` },
    revision,
    type: UiCollectionOperationType.Insert
  });
}

function removeItem(harness: MountedCollectionHarness, expectedRevision: string, revision: string) {
  const key = harness.insertedKey as string;
  harness.insertedKey = undefined;
  return harness.application.applyCollectionOperation({
    collectionId: "items",
    expectedRevision,
    key,
    revision,
    type: UiCollectionOperationType.Remove
  });
}

function hasExactMountedState(harness: MountedCollectionHarness): boolean {
  const expectedCount = ITEM_COUNT + (harness.insertedKey === undefined ? 0 : 1);
  const children = collectionChildCount(harness);
  const nodes = Object.keys(harness.application.document.nodesById).length;
  return [
    children === expectedCount && nodes === expectedCount + 2,
    authoredRevision(harness) === String(harness.revision),
    hasInsertedIdentity(harness)
  ].every(Boolean);
}

function hasInsertedIdentity(harness: MountedCollectionHarness): boolean {
  if (harness.insertedKey === undefined) return true;
  const id = `field::${encodeURIComponent(harness.insertedKey)}`;
  return harness.application.document.nodesById[id] !== undefined;
}

function authoredRevision(harness: MountedCollectionHarness): unknown {
  const authored = harness.application.authored;
  if (!isRecord(authored)) return undefined;
  return authored["revision"];
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function collectionChildCount(harness: MountedCollectionHarness): number {
  const collection = harness.application.document.nodesById["items"];
  if (collection === undefined) return -1;
  if (collection.controlChildIds === undefined) return -1;
  return collection.controlChildIds.length;
}
