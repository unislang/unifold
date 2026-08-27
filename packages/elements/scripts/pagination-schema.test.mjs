import assert from "node:assert/strict";
import { test } from "node:test";

import { paginationItemListSchema } from "./pagination-schema.mjs";

test("defines the bounded enum-backed Pagination item schema", () => {
  assert.equal(paginationItemListSchema.minItems, 1);
  assert.equal(paginationItemListSchema.maxItems, 100);
  assert.deepEqual(paginationItemListSchema.items.required, [
    "accessibleLabel",
    "id",
    "kind",
    "label"
  ]);
  assert.deepEqual(paginationItemListSchema.items.properties.kind.enum, [
    "next",
    "overflow",
    "page",
    "previous"
  ]);
  assert.deepEqual(paginationItemListSchema.items.properties.id.not, {
    enum: ["__proto__", "constructor", "prototype"]
  });
});
