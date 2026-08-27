import { describe, expect, it, vi } from "vitest";
import {
  createSelector,
  nodeSelector,
  NormalizedNodeStore,
  NormalizedNodeStoreCoordinationStatus
} from "./index.js";
import { metadata, setValue } from "./lifecycle.test-data.js";
import { controlNode } from "./test-helpers.js";

describe("NormalizedNodeStore coordination", () => {
  it("publishes staged records and one selection refresh on commit", verifyCommit);
  it("restores the exact public store state on discard", verifyDiscard);
  it("defers selection invalidation until commit", verifyDeferredInvalidation);
  it("rejects overlapping operations that cannot be restored", verifyRejectedOperations);
  it("preserves metrics when an empty scope commits", verifyEmptyCommit);
});

function verifyCommit(): void {
  const store = new NormalizedNodeStore([controlNode("field", "A")]);
  const revision = store.select(createSelector((state) => state.revision));
  const observed = vi.fn();
  revision.subscribe(observed);
  const coordination = store.beginCoordination();
  const first = update(store, "first", "B");
  const second = update(store, "second", "C");

  expect(store.revision).toBe(2);
  expect(revision.get()).toBe(0);
  expect(observed).not.toHaveBeenCalled();
  expect(store.getTransaction(1)).toBeUndefined();
  expect(store.getTransaction(2)).toBeUndefined();

  coordination.commit();
  expect(coordination.status).toBe(NormalizedNodeStoreCoordinationStatus.Committed);
  expect(revision.get()).toBe(2);
  expect(observed).toHaveBeenCalledOnce();
  expect(store.getTransaction(1)).toBe(first);
  expect(store.getTransaction(2)).toBe(second);
  expect(store.getSelectionDispatchMetrics()).toEqual({
    activeSelections: 1,
    candidateSelections: 1,
    changedNodeCount: 1,
    invalidatedSelections: 0
  });
}

function verifyDiscard(): void {
  const store = new NormalizedNodeStore([controlNode("field", "A")], {
    transactionRetention: 2
  });
  const selection = store.select(nodeSelector("field"));
  const retained = update(store, "retained", "B");
  const previousMetrics = store.getSelectionDispatchMetrics();
  const previousSnapshot = store.getSnapshot("field");
  const coordination = store.beginCoordination();
  update(store, "discarded", "C");

  expect(store.revision).toBe(2);
  expect(selection.get()).toBe(previousSnapshot);
  expect(store.getTransaction(2)).toBeUndefined();
  coordination.discard();

  expect(coordination.status).toBe(NormalizedNodeStoreCoordinationStatus.Discarded);
  expect(store.revision).toBe(1);
  expect(store.getSnapshot("field")).toBe(previousSnapshot);
  expect(store.getTransaction(1)).toBe(retained);
  expect(store.getTransaction(2)).toBeUndefined();
  expect(store.getSelectionDispatchMetrics()).toBe(previousMetrics);
  const replacement = update(store, "replacement", "D");
  expect(store.getTransaction(1)).toBe(retained);
  expect(store.getTransaction(2)).toBe(replacement);
}

function verifyRejectedOperations(): void {
  const store = new NormalizedNodeStore([controlNode("field", "A")]);
  const coordination = store.beginCoordination();
  expect(() => store.beginCoordination()).toThrow("already active");
  expect(() => store.select(nodeSelector("field"))).toThrow("Cannot create a selection");
  expect(() => store.dispose()).toThrow("Cannot dispose");
  coordination.discard();
  expect(() => coordination.commit()).toThrow("already discarded");
  expect(() => coordination.discard()).toThrow("already discarded");
}

function verifyDeferredInvalidation(): void {
  const store = new NormalizedNodeStore([controlNode("field", "A")]);
  const selection = store.select(nodeSelector("field"));
  const coordination = store.beginCoordination();
  store.transact(metadata("remove"), (draft) => draft.remove("field"));
  expect(selection.get().id).toBe("field");
  expect(store.getSelectionDispatchMetrics().invalidatedSelections).toBe(0);
  coordination.commit();
  expect(store.getSelectionDispatchMetrics()).toMatchObject({
    activeSelections: 0,
    invalidatedSelections: 1
  });
}

function verifyEmptyCommit(): void {
  const store = new NormalizedNodeStore([controlNode("field", "A")]);
  store.select(nodeSelector("field"));
  update(store, "before", "B");
  const metrics = store.getSelectionDispatchMetrics();
  const coordination = store.beginCoordination();
  coordination.commit();
  expect(store.getSelectionDispatchMetrics()).toBe(metrics);
  expect(store.revision).toBe(1);
}

function update(store: NormalizedNodeStore, id: string, value: string) {
  return store.transact(metadata(id), (draft) => draft.update("field", setValue(value)));
}
