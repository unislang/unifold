import { expect, it } from "vitest";
import { UiCollectionOperationType } from "@unislang/unifold-contracts";

import {
  UnifoldCollectionOperationError,
  createAuthoredCollectionCandidate,
  type UnifoldCollectionInsertOperation,
  type UnifoldCollectionMoveOperation,
  type UnifoldCollectionRemoveOperation,
  type UnifoldCollectionOperation
} from "./authored-collection.js";

const document = {
  id: "list",
  revision: "1",
  variables: {
    items: [
      { id: "a", label: "Alpha" },
      { id: "b", label: "Beta" }
    ]
  }
};

it("inserts, moves, and removes an authorized collection by durable key", () => {
  const inserted = apply(insertOperation());
  expect(inserted.variables.items.map(({ id }) => id)).toEqual(["a", "c", "b"]);
  const moved = apply(moveOperation(), inserted);
  expect(moved.variables.items.map(({ id }) => id)).toEqual(["b", "a", "c"]);
  const removed = apply(removeOperation(), moved);
  expect(removed.variables.items.map(({ id }) => id)).toEqual(["b", "c"]);
  expect(removed.revision).toBe("4");
  expect(document.revision).toBe("1");
});

it("rejects unknown collections, conflicts, duplicate keys, and invalid indexes", () => {
  const cases: readonly UnifoldCollectionOperation[] = [
    { ...insertOperation(), collectionId: "unknown" },
    { ...insertOperation(), expectedRevision: "stale" },
    { ...insertOperation(), item: { id: "a" } },
    { ...insertOperation(), index: 3 },
    { ...moveOperation(), key: "missing" },
    { ...removeOperation(), revision: "1" }
  ];
  cases.forEach((operation) =>
    expect(() => createAuthoredCollectionCandidate(source(document), operation)).toThrow(
      UnifoldCollectionOperationError
    )
  );
});

it("rejects missing insert keys and invalid authorized targets without mutation", () => {
  expect(() =>
    createAuthoredCollectionCandidate(source(document), {
      ...insertOperation(),
      item: { label: "Missing" }
    })
  ).toThrow("key is invalid");
  expect(() =>
    createAuthoredCollectionCandidate(
      { authored: document, collectionsById: { items: binding("/variables/missing") } },
      insertOperation()
    )
  ).toThrow("not an authored array");
  expect(document.variables.items).toHaveLength(2);
});

it("rejects unknown operation types and inherited collection names", () => {
  const invalid = {
    ...removeOperation(),
    type: "replace"
  } as unknown as UnifoldCollectionOperation;
  expect(() => createAuthoredCollectionCandidate(source(document), invalid)).toThrow(
    "operation type is invalid"
  );
  expect(() =>
    createAuthoredCollectionCandidate(source(document), {
      ...insertOperation(),
      collectionId: "toString"
    })
  ).toThrow("Compiled collection was not found");
  expect(document.variables.items).toHaveLength(2);
});

it("rejects numeric keys that cannot round-trip as durable JSON identities", () => {
  expect(() =>
    createAuthoredCollectionCandidate(source(document), {
      ...insertOperation(),
      item: { id: Number.MAX_SAFE_INTEGER + 1 }
    })
  ).toThrow("key is invalid");
  expect(document.variables.items).toHaveLength(2);
});

function apply(
  operation: UnifoldCollectionOperation,
  authored: typeof document = document
): typeof document {
  return createAuthoredCollectionCandidate(source(authored), operation).authored as typeof document;
}

function source(authored: typeof document) {
  return { authored, collectionsById: { items: binding("/variables/items") } };
}

function binding(sourcePointer: string) {
  return { keyProperty: "id", sourcePointer };
}

function insertOperation(): UnifoldCollectionInsertOperation {
  return {
    collectionId: "items",
    expectedRevision: "1",
    index: 1,
    item: { id: "c", label: "Gamma" },
    revision: "2",
    type: UiCollectionOperationType.Insert
  };
}

function moveOperation(): UnifoldCollectionMoveOperation {
  return {
    collectionId: "items",
    expectedRevision: "2",
    index: 0,
    key: "b",
    revision: "3",
    type: UiCollectionOperationType.Move
  };
}

function removeOperation(): UnifoldCollectionRemoveOperation {
  return {
    collectionId: "items",
    expectedRevision: "3",
    key: "a",
    revision: "4",
    type: UiCollectionOperationType.Remove
  };
}
