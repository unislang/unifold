import { expect, it, vi } from "vitest";

import { createSelector, nodeSelector, NormalizedNodeStore } from "./index.js";
import { metadata, setValue } from "./lifecycle.test-data.js";
import { controlNode } from "./test-helpers.js";

it("supports global, indexed, equal, and disposed selections", () => {
  const store = new NormalizedNodeStore([controlNode("field", "A")]);
  const indexed = store.select(nodeSelector("field"));
  const globalRead = vi.fn(() => "unchanged");
  const global = store.select(createSelector(globalRead));
  const observed = vi.fn();
  const unsubscribe = global.subscribe(observed);
  store.transact(metadata("update"), (draft) => draft.update("field", setValue("B")));
  expect(indexed.get().control?.value).toBe("B");
  expect(globalRead).toHaveBeenCalledTimes(2);
  expect(observed).not.toHaveBeenCalled();
  expect(store.getSelectionDispatchMetrics().candidateSelections).toBe(2);
  unsubscribe();
  global.dispose();
  global.dispose();
  store.dispose();
});

it("completes indexed selections when their node is removed", () => {
  const store = new NormalizedNodeStore([controlNode("field", "A")]);
  const selection = store.select(nodeSelector("field"));
  const complete = vi.fn();
  selection.changes$.subscribe({ complete });
  store.transact(metadata("remove"), (draft) => draft.remove("field"));
  expect(complete).toHaveBeenCalledTimes(1);
  expect(selection.get().id).toBe("field");
});

it("completes indexed selections when their node lifetime is replaced", () => {
  const store = new NormalizedNodeStore([controlNode("field", "A")]);
  const selection = store.select(nodeSelector("field"));
  const complete = vi.fn();
  selection.changes$.subscribe({ complete });
  const replacement = { ...controlNode("field", "B"), definitionVersion: "2.0.0" };
  store.transact(metadata("replace"), (draft) => draft.reconcile([replacement]));
  expect(complete).toHaveBeenCalledTimes(1);
});
