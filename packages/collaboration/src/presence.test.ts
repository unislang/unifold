import type { JsonObject } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { actor } from "./collaboration.test-data.js";
import { CollaborationPresenceRegistry } from "./presence.js";
import {
  CollaborationOperation,
  CollaborationProtocolVersion,
  type CollaborationPresenceRequest
} from "./types.js";

it("keeps tenant-scoped presence ephemeral and expires it without document state", () => {
  const registry = new CollaborationPresenceRegistry();
  const author = actor();
  const candidate = request();
  const value = registry.update(candidate, author, 1_000);
  const cursor = requiredCursor(value);
  const selection = requiredSelection(cursor);
  expect(value.actorId).toBe(author.actorId);
  expect(Object.isFrozen(cursor)).toBe(true);
  expect(Object.isFrozen(selection)).toBe(true);
  Reflect.set(requiredSelection(requiredCursor(candidate)), "start", 99);
  expect(selection["start"]).toBe(1);
  expect(registry.snapshot(author.tenantId, "main", 1_500)).toHaveLength(1);
  expect(registry.snapshot("other-tenant", "main", 1_500)).toEqual([]);
  expect(registry.remove(author.tenantId, "main", "missing")).toBe(false);
  expect(registry.sweep(1_500)).toBe(0);
  expect(registry.sweep(3_001)).toBe(1);
  expect(registry.snapshot(author.tenantId, "main", 3_001)).toEqual([]);
});

function requiredCursor(value: { readonly cursor?: JsonObject }): JsonObject {
  if (value.cursor === undefined) throw new Error("Expected a presence cursor.");
  return value.cursor;
}

function requiredSelection(cursor: JsonObject): JsonObject {
  const selection = cursor["selection"];
  if ([selection === null, typeof selection !== "object", Array.isArray(selection)].some(Boolean)) {
    throw new Error("Expected a presence selection.");
  }
  return selection as JsonObject;
}

function request(): CollaborationPresenceRequest {
  return {
    branchId: "main",
    correlationId: "correlation-1",
    cursor: { column: 2, line: 1, selection: { end: 4, start: 1 } },
    draft: true,
    expiresInMs: 2_000,
    operation: CollaborationOperation.Presence,
    protocolVersion: CollaborationProtocolVersion.Version1,
    requestId: "request-1",
    selectedId: "title"
  };
}
