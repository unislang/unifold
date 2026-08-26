import { DataClassification } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { NormalizedNodeStore } from "./index.js";
import { metadata } from "./lifecycle.test-data.js";
import { controlNode } from "./test-helpers.js";

it("adds and removes nodes while preserving parent links", () => {
  const store = new NormalizedNodeStore([controlNode("parent", "")]);
  store.transact(metadata("add"), (draft) => draft.add(controlNode("child", "A", "parent")));
  expect(store.getSnapshot("child").parentId).toBe("parent");
  store.transact(metadata("remove"), (draft) => draft.remove("child"));
  expect(() => store.getSnapshot("child")).toThrow("Unknown node: child");
});

it("enumerates descendants in stable breadth-first order", () => {
  const store = new NormalizedNodeStore([
    controlNode("root", ""),
    controlNode("first", "", "root"),
    controlNode("second", "", "root"),
    controlNode("nested", "", "first")
  ]);
  store.transact(metadata("inspect"), (draft) => {
    expect(draft.descendantIds("root")).toEqual(["first", "second", "nested"]);
  });
});

it("reads the current transaction draft for derived processors", () => {
  const store = new NormalizedNodeStore([controlNode("field", "before")]);
  store.transact(metadata("read"), (draft) => {
    draft.update("field", (node) => {
      node.base.disabled = true;
    });
    expect(draft.getSnapshot("field").base.disabled).toBe(true);
  });
});

it("rejects invalid structural mutations", () => {
  const store = new NormalizedNodeStore([
    controlNode("parent", ""),
    controlNode("child", "A", "parent")
  ]);
  expectChangeError(store, (draft) => draft.add(controlNode("child", "B")), "Duplicate node");
  expectChangeError(
    store,
    (draft) => draft.add(controlNode("orphan", "", "missing")),
    "Unknown parent"
  );
  expectChangeError(store, (draft) => draft.remove("parent"), "Node has children");
  expectChangeError(store, (draft) => draft.remove("missing"), "Unknown node");
  expectChangeError(
    store,
    (draft) => draft.update("child", (node) => (node.id = "other")),
    "immutable"
  );
  expectChangeError(
    store,
    (draft) => draft.update("child", (node) => delete node.parentId),
    "reparent"
  );
});

it("reconciles a graph while preserving dirty compatible control state", () => {
  const field = dirtyControl(controlNode("field", "User", "old-form"));
  const store = new NormalizedNodeStore([controlNode("old-form", ""), field]);
  const desired = controlNode("field", "Default", "new-form");
  store.transact(metadata("reconcile"), (draft) => {
    draft.reconcile([
      controlNode("new-form", ""),
      { ...desired, properties: { label: "Renamed" }, control: requiredControl(desired) },
      controlNode("added", "New", "new-form")
    ]);
  });
  expect(store.getSnapshot("field")).toMatchObject({
    base: { focused: true },
    control: { dirty: true, required: true, value: "User" },
    parentId: "new-form",
    properties: { label: "Renamed" }
  });
  expect(store.getNodeIds()).toEqual(["field", "new-form", "added"]);
  expect(() => store.getSnapshot("old-form")).toThrow("Unknown node");
});

it("uses new defaults for pristine controls and incompatible lifetimes", () => {
  const store = new NormalizedNodeStore([controlNode("field", "Old")]);
  store.transact(metadata("default"), (draft) => draft.reconcile([controlNode("field", "New")]));
  expect(store.getSnapshot("field").control?.value).toBe("New");
  const replacement = { ...controlNode("field", "Reset"), type: "Select" };
  store.transact(metadata("replace"), (draft) => draft.reconcile([replacement]));
  expect(store.getSnapshot("field")).toMatchObject({ type: "Select", control: { value: "Reset" } });
});

it("keeps the maximum classification while retaining dirty control state", () => {
  const current = classified(
    dirtyControl(controlNode("field", "User")),
    DataClassification.Restricted
  );
  const store = new NormalizedNodeStore([current]);
  store.transact(metadata("downgrade"), (draft) => {
    draft.reconcile([classified(controlNode("field", "Default"), DataClassification.Public)]);
  });
  expect(store.getSnapshot("field").base.dataClassification).toBe(DataClassification.Restricted);

  store.transact(metadata("upgrade"), (draft) => {
    draft.reconcile([classified(controlNode("field", "Default"), DataClassification.NeverExport)]);
  });
  expect(store.getSnapshot("field").base.dataClassification).toBe(DataClassification.NeverExport);
});

it("rejects invalid reconciliation without committing", () => {
  const store = new NormalizedNodeStore([controlNode("field", "A")]);
  expectChangeError(store, (draft) => draft.reconcile(duplicateNodes()), "Duplicate reconciled");
  expectChangeError(store, (draft) => draft.reconcile(orphanNodes()), "Unknown reconciled parent");
  expectChangeError(store, (draft) => draft.reconcile(cyclicNodes()), "parent cycle");
  expect(store.revision).toBe(0);
});

function dirtyControl(node: ReturnType<typeof controlNode>) {
  if (node.control === undefined) throw new Error("Expected a control.");
  return {
    ...node,
    base: { ...node.base, focused: true },
    control: { ...node.control, dirty: true, pristine: false }
  };
}

function requiredControl(node: ReturnType<typeof controlNode>) {
  if (node.control === undefined) throw new Error("Expected a control.");
  return { ...node.control, required: true };
}

function classified<T extends ReturnType<typeof controlNode>>(
  node: T,
  dataClassification: DataClassification
): T {
  return { ...node, base: { ...node.base, dataClassification } };
}

function duplicateNodes() {
  return [controlNode("field", "A"), controlNode("field", "B")];
}

function orphanNodes() {
  return [controlNode("field", "A", "missing")];
}

function cyclicNodes() {
  return [controlNode("first", "A", "second"), controlNode("second", "B", "first")];
}

type TransactionDraft = Parameters<Parameters<NormalizedNodeStore["transact"]>[1]>[0];

function expectChangeError(
  store: NormalizedNodeStore,
  change: (draft: TransactionDraft) => void,
  message: string
): void {
  expect(() => store.transact(metadata("invalid"), change)).toThrow(message);
}
