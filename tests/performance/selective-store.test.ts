import { createSelector } from "@unislang/unifold-reactivity";
import { expect, it } from "vitest";

import {
  ONE_THOUSAND_NODES,
  TEN_THOUSAND_NODES,
  createAggregateScaleHarness,
  createScaleHarness,
  reorderFirstGroup,
  replay,
  selectedCount,
  updateBulk,
  updateAggregateOne,
  updateOne
} from "./scale-fixture.js";

it.each([ONE_THOUSAND_NODES, TEN_THOUSAND_NODES])(
  "dispatches a one-node edit to one of %i indexed selections",
  (nodeCount) => {
    const harness = createScaleHarness(nodeCount);
    updateOne(harness, 1);

    expect(harness.nodes).toHaveLength(nodeCount);
    expect(harness.selectedIds).toHaveLength(nodeCount / 5);
    expect(harness.store.getSelectionDispatchMetrics()).toEqual({
      activeSelections: nodeCount / 5,
      candidateSelections: 1,
      changedNodeCount: 1,
      invalidatedSelections: 0
    });
    expect(harness.reads.get(harness.targetId)).toBe(2);
    expect(total(harness.notifications)).toBe(1);
    harness.store.dispose();
  }
);

it("dispatches a 1% bulk edit only to intersecting 10k selections", () => {
  const harness = createScaleHarness(TEN_THOUSAND_NODES);
  const changedIds = updateBulk(harness, 1);
  const expected = selectedCount(harness.selectedIds, changedIds);

  expect(changedIds).toHaveLength(100);
  expect(harness.store.getSelectionDispatchMetrics()).toEqual({
    activeSelections: TEN_THOUSAND_NODES / 5,
    candidateSelections: expected,
    changedNodeCount: 100,
    invalidatedSelections: 0
  });
  expect(total(harness.notifications)).toBe(expected);
  harness.store.dispose();
});

it("supports a 10k no-selection transaction baseline", () => {
  const harness = createScaleHarness(TEN_THOUSAND_NODES, false);
  updateOne(harness, 1);
  expect(harness.store.getSelectionDispatchMetrics()).toEqual({
    activeSelections: 0,
    candidateSelections: 0,
    changedNodeCount: 1,
    invalidatedSelections: 0
  });
  harness.store.dispose();
});

it("notifies exactly one structural selector for a 10k sibling reorder", () => {
  const harness = createScaleHarness(TEN_THOUSAND_NODES);
  const groupId = "group-000";
  let notifications = 0;
  harness.store
    .select(createSelector((state) => state.children[groupId], [groupId]))
    .subscribe(() => (notifications += 1));

  expect(reorderFirstGroup(harness, 2)).toBe(groupId);
  expect(harness.nodes.filter(({ parentId }) => parentId === groupId)).toHaveLength(100);
  expect(harness.store.getSelectionDispatchMetrics()).toEqual({
    activeSelections: TEN_THOUSAND_NODES / 5 + 1,
    candidateSelections: 1,
    changedNodeCount: 1,
    invalidatedSelections: 0
  });
  expect(notifications).toBe(1);
  harness.store.dispose();
});

it("keeps 100 replay transactions at one indexed candidate each", () => {
  const harness = createScaleHarness(TEN_THOUSAND_NODES);
  replay(harness, 100, 1);

  expect(harness.store.revision).toBe(100);
  expect(harness.store.getSelectionDispatchMetrics().candidateSelections).toBe(1);
  expect(harness.candidateCounts).toEqual(Array.from({ length: 100 }, () => 1));
  expect(total(harness.notifications)).toBe(100);
  harness.store.dispose();
});

it("limits a leaf edit in an aggregate-heavy 10k graph to its ancestor chain", () => {
  const harness = createAggregateScaleHarness(TEN_THOUSAND_NODES);
  const record = updateAggregateOne(harness, 1);

  expect(harness.nodes).toHaveLength(TEN_THOUSAND_NODES);
  expect(harness.validationCalls).toEqual(["group-000", "aggregate-root"]);
  expect(new Set(record.changedNodeIds)).toEqual(
    new Set([harness.targetId, "group-000", "aggregate-root"])
  );
  expect(harness.store.getSelectionDispatchMetrics()).toEqual({
    activeSelections: 3,
    candidateSelections: 3,
    changedNodeCount: 3,
    invalidatedSelections: 0
  });
  expect(total(harness.notifications)).toBe(3);
  harness.store.dispose();
});

function total(values: ReadonlyMap<string, number>): number {
  return [...values.values()].reduce((sum, value) => sum + value, 0);
}
