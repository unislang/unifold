import { UiNodeKind } from "@unislang/unifold-contracts";
import { UnifoldPreparationStatus } from "@unislang/unifold";
import { expect, it } from "vitest";

import {
  AUTHORED_COLLECTION_ITEM_COUNT,
  compileAuthoredCollection,
  compileAuthoredCollectionRevision,
  createAuthoredCollectionHarness
} from "./authored-collection-fixture.js";

it("compiles a representative authored collection and one-item revision", () => {
  const harness = createAuthoredCollectionHarness();
  const initial = compileAuthoredCollection(harness);
  const revision = compileAuthoredCollectionRevision(harness);
  expect(initial.status).toBe(UnifoldPreparationStatus.Valid);
  expect(revision.status).toBe(UnifoldPreparationStatus.Valid);
  expect(initial.prepared?.document.nodesById["items"]).toMatchObject({
    controlChildIds: expect.arrayContaining(["field::item-00000", "field::item-00499"]),
    kind: UiNodeKind.Array
  });
  expect(collectionChildIds(initial)).toHaveLength(AUTHORED_COLLECTION_ITEM_COUNT);
  expect(collectionChildIds(revision)).toHaveLength(AUTHORED_COLLECTION_ITEM_COUNT + 1);
  expect(initial.prepared?.collectionsById["items"]).toEqual({
    controlId: "items",
    declarationPointer: "/layouts/0/template/children/0/children/0/collection",
    keyProperty: "id",
    sourcePointer: "/variables/items"
  });
});

function collectionChildIds(result: ReturnType<typeof compileAuthoredCollection>) {
  const prepared = result.prepared;
  if (prepared === undefined) return [];
  const collection = prepared.document.nodesById["items"];
  if (collection === undefined) return [];
  return collection.controlChildIds;
}
