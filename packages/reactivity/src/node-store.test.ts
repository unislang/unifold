import { UiValidationSeverity } from "@unislang/unifold-events";
import { describe, expect, it, vi } from "vitest";
import { createSelector, NormalizedNodeStore, type NodeRecipe } from "./index.js";
import { controlNode } from "./test-helpers.js";
import { metadata as transactionMetadata, setValue as updateValue } from "./lifecycle.test-data.js";

const metadata = {
  id: "transaction-1",
  correlationId: "correlation-1",
  timestamp: "2026-08-24T00:00:00.000Z"
};

describe("NormalizedNodeStore atomic commits", () => {
  it("notifies changed selections after commit", verifiesAtomicCommit);
});

describe("NormalizedNodeStore rollback", () => {
  it("does not commit a failed transaction", verifiesRollback);
});

describe("NormalizedNodeStore selection index", () => {
  it("skips selections whose declared nodes did not change", verifiesIndex);
});

it("rejects invalid initial graphs", verifyInvalidInitialGraph);
it("applies a derived initializer before exposing revision zero", verifyInitializer);
it("retains only configured transaction history", verifyTransactionRetention);
it("reports escaped JSON pointer paths", verifyEscapedChangedPaths);
it("invalidates affected nodes when routed errors change", verifyValidationRouting);
it("does not create an authoritative revision for a no-op transaction", verifyNoOpTransaction);

function verifiesAtomicCommit(): void {
  const store = new NormalizedNodeStore([controlNode("first", "A"), controlNode("second", "B")]);
  const selection = store.select(
    createSelector(
      (state) => `${controlValue(state.nodes["first"])}:${controlValue(state.nodes["second"])}`,
      ["first", "second"]
    )
  );
  const observed = vi.fn(() => store.revision);
  selection.subscribe(observed);
  const record = store.transact(metadata, (draft) => {
    draft.update("first", setValue("C"));
    draft.update("second", setValue("D"));
  });
  expect(selection.get()).toBe("C:D");
  expect(observed).toHaveReturnedWith(1);
  expect(record.changedNodeIds).toEqual(["first", "second"]);
}

function verifiesRollback(): void {
  const store = new NormalizedNodeStore([controlNode("first", "A")]);
  expect(() =>
    store.transact(metadata, (draft) => {
      draft.update("first", setValue("B"));
      draft.update("missing", () => undefined);
    })
  ).toThrow("Unknown node: missing");
  expect(store.revision).toBe(0);
  expect(controlValue(store.getSnapshot("first"))).toBe("A");
}

function verifiesIndex(): void {
  const store = new NormalizedNodeStore([controlNode("first", "A"), controlNode("second", "B")]);
  const read = vi.fn((state) => controlValue(state.nodes.second));
  store.select(createSelector(read, ["second"]));
  store.transact(metadata, (draft) => draft.update("first", setValue("C")));
  expect(read).toHaveBeenCalledTimes(1);
  expect(store.getSelectionDispatchMetrics()).toEqual({
    activeSelections: 1,
    candidateSelections: 0,
    changedNodeCount: 1,
    invalidatedSelections: 0
  });
}

function verifyInvalidInitialGraph(): void {
  expect(
    () => new NormalizedNodeStore([controlNode("same", "A"), controlNode("same", "B")])
  ).toThrow("Duplicate node: same");
  expect(() => new NormalizedNodeStore([controlNode("child", "A", "missing")])).toThrow(
    "Unknown control parent: missing"
  );
  const form = { ...controlNode("form", ""), controlChildIds: ["first", "second"] };
  const first = explicitChild("first", "form", "same");
  const second = explicitChild("second", "form", "same");
  expect(() => new NormalizedNodeStore([form, first, second])).toThrow("Duplicate control key");
  expect(() => new NormalizedNodeStore([]).getSnapshot("missing")).toThrow("Unknown node: missing");
}

function explicitChild(id: string, controlParentId: string, controlKey: string) {
  return { ...controlNode(id, ""), controlChildIds: [], controlKey, controlParentId };
}

function verifyInitializer(): void {
  const store = new NormalizedNodeStore([controlNode("field", "before")], {
    initializer: (draft) => draft.update("field", updateValue("after"))
  });
  expect(store.getSnapshot("field")).toMatchObject({
    control: { value: "after" },
    revision: 0
  });
  expect(store.revision).toBe(0);
}

function verifyTransactionRetention(): void {
  const store = new NormalizedNodeStore([controlNode("field", "A")], {
    transactionRetention: 1
  });
  store.transact(transactionMetadata("first"), (draft) => draft.update("field", updateValue("B")));
  const latest = store.transact(transactionMetadata("second"), (draft) =>
    draft.update("field", updateValue("C"))
  );
  expect(store.getTransaction(1)).toBeUndefined();
  expect(store.getTransaction(2)).toBe(latest);
}

function verifyEscapedChangedPaths(): void {
  const id = "field/~value";
  const store = new NormalizedNodeStore([controlNode(id, "A")]);
  const record = store.transact(transactionMetadata("escaped"), (draft) =>
    draft.update(id, updateValue("B"))
  );
  expect(record.changedPaths).toContain("/nodes/field~1~0value/control/value");
}

function verifyValidationRouting(): void {
  const store = new NormalizedNodeStore([controlNode("owner", ""), controlNode("target", "")]);
  const added = store.transact(transactionMetadata("add-route"), (draft) => {
    draft.update("owner", assignRoutedError);
  });
  expect(added.changedNodeIds).toEqual(["owner", "target"]);
  expect(store.getValidationErrors("target")).toMatchObject([{ ownerId: "owner" }]);
  const removed = store.transact(transactionMetadata("remove-route"), (draft) => {
    draft.update("owner", clearErrors);
  });
  expect(removed.changedNodeIds).toEqual(["owner", "target"]);
  expect(store.getValidationErrors("target")).toEqual([]);
}

function verifyNoOpTransaction(): void {
  const store = new NormalizedNodeStore([controlNode("field", "A")]);
  const observed = vi.fn();
  store.select(createSelector((state) => state.revision)).subscribe(observed);
  const record = store.transact(transactionMetadata("no-op"), () => undefined);
  expect(record).toMatchObject({ changedNodeIds: [], previousRevision: 0, revision: 0 });
  expect(store.getTransaction(0)).toBeUndefined();
  expect(observed).not.toHaveBeenCalled();
}

function assignRoutedError(node: Parameters<NodeRecipe>[0]): void {
  if (node.control === undefined) throw new Error("Owner control is missing.");
  node.control.errors = [
    {
      affectedIds: ["target"],
      code: "match",
      messageKey: "validation.match",
      ownerId: "owner",
      severity: UiValidationSeverity.Error,
      validatorId: "match"
    }
  ];
}

function clearErrors(node: Parameters<NodeRecipe>[0]): void {
  if (node.control === undefined) throw new Error("Owner control is missing.");
  node.control.errors = [];
}

function setValue(value: string): NodeRecipe {
  return (node) => {
    if (node.control === undefined) return;
    Object.assign(node.control, { value });
  };
}

function controlValue(node: { control?: { value: unknown } } | undefined): unknown {
  return node?.control?.value;
}
