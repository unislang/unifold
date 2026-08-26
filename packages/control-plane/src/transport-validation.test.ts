import { expect, it } from "vitest";

import { metadata } from "./control-plane.test-data.js";
import { decodeControlPlaneRequest, safeJson } from "./transport-validation.js";
import { ControlPlaneOperation } from "./types.js";

it("decodes every exact versioned operation shape", () => {
  const requests = [
    metadata(ControlPlaneOperation.BackupCreate),
    { ...metadata(ControlPlaneOperation.BackupRestore), backupId: "backup-1" },
    {
      ...metadata(ControlPlaneOperation.DocumentCommit),
      document: { nodes: [] },
      objectId: "document-1"
    },
    { ...metadata(ControlPlaneOperation.DocumentRead), objectId: "document-1" },
    {
      ...metadata(ControlPlaneOperation.EffectInvoke),
      effectId: "orders.submit",
      idempotencyKey: "effect-1",
      input: null,
      objectId: "document-1"
    },
    { ...metadata(ControlPlaneOperation.RealtimeResume), afterSequence: 0 }
  ];
  for (const request of requests) expect(decodeControlPlaneRequest(request)).toEqual(request);
});

it("rejects unknown fields, client identity, unsafe keys, and invalid bounds", () => {
  const base = { ...metadata(ControlPlaneOperation.DocumentRead), objectId: "document-1" };
  expect(decodeControlPlaneRequest({ ...base, actorId: "attacker" })).toBeUndefined();
  expect(decodeControlPlaneRequest({ ...base, requestId: "x".repeat(129) })).toBeUndefined();
  expect(decodeControlPlaneRequest({ ...base, operation: "unknown" })).toBeUndefined();
  expect(
    decodeControlPlaneRequest(JSON.parse('{"operation":"document.read","__proto__":{}}'))
  ).toBeUndefined();
});

it("bounds nested JSON by depth, total members, finite numbers, and safe property names", () => {
  let nested: unknown = null;
  for (let index = 0; index < 34; index += 1) nested = [nested];
  expect(safeJson(nested)).toBe(false);
  expect(safeJson(Array.from({ length: 20_001 }, () => null))).toBe(false);
  expect(safeJson(Number.POSITIVE_INFINITY)).toBe(false);
  expect(safeJson(JSON.parse('{"nested":{"constructor":true}}'))).toBe(false);
});
