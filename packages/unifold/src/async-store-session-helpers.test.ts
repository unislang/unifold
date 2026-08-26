import { expect, it, vi } from "vitest";

import {
  adapterCommit,
  authorizedStoreOperation,
  cancelledCommitRejection,
  cloneSnapshot,
  invalidIdentityCommitRejection,
  revisionCommitRejection,
  sanitizeAdapterCommitResult
} from "./async-store-session-helpers.js";
import { storeDefinition } from "./store-adapters-base.test-data.js";

it("contains authorization failures and emits exact sink context", async () => {
  const decide = vi.fn(async () => {
    throw new Error("private authorization failure");
  });
  await expect(
    authorizedStoreOperation(storeDefinition(), { authorization: { decide } }, "commit", "/name")
  ).resolves.toBe(false);
  expect(decide).toHaveBeenCalledWith({
    classification: storeDefinition().classification,
    operation: "commit",
    path: "/name",
    storeId: "customer"
  });
});

it("sanitizes malformed provider results and clones complete adapter candidates", () => {
  expect(sanitizeAdapterCommitResult({ status: "private-provider-status" })).toEqual({
    code: "store-commit-result-invalid",
    status: "invalid"
  });
  const candidate = { name: "Grace" };
  const result = adapterCommit(
    {
      expectedRevision: "revision-1",
      idempotencyKey: "commit-1",
      path: "/name",
      value: "Grace"
    },
    candidate,
    "2.1.0"
  );
  candidate.name = "mutated";
  expect(result.candidate).toEqual({ name: "Grace" });
});

it("closes malformed identities, revisions, cancellations, and provider result shapes", () => {
  expect(invalidIdentityCommitRejection(commitWithIdentity(""))).toMatchObject({
    status: "invalid"
  });
  expect(invalidIdentityCommitRejection(commitWithIdentity("valid"))).toBeUndefined();
  expect(revisionCommitRejection(undefined, "revision-1")).toMatchObject({ status: "conflict" });
  const controller = new AbortController();
  expect(cancelledCommitRejection(controller.signal)).toBeUndefined();
  controller.abort();
  expect(cancelledCommitRejection(controller.signal)).toMatchObject({ status: "cancelled" });
  expect(cloneSnapshot(undefined)).toBeUndefined();
  expect(sanitizeAdapterCommitResult(null)).toMatchObject({ status: "invalid" });
  expect(sanitizeAdapterCommitResult({ status: "conflict" })).toEqual({
    code: "store-commit-conflict",
    status: "conflict"
  });
  expect(sanitizeAdapterCommitResult({ snapshot: {}, status: "committed" })).toMatchObject({
    status: "committed"
  });
});

function commitWithIdentity(idempotencyKey: string) {
  return {
    expectedRevision: "revision-1",
    idempotencyKey,
    path: "/name",
    value: "Grace"
  };
}
