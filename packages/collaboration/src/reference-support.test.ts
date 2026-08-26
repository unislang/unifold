import { expect, it } from "vitest";

import {
  accepted,
  defaultBranchPolicy,
  freezeDocument,
  normalizeBranchPolicy,
  requestFingerprint
} from "./reference-support.js";

it("normalizes bounded policies and freezes defensive documents", () => {
  expect(normalizeBranchPolicy(undefined)).toEqual(defaultBranchPolicy);
  expect(() =>
    normalizeBranchPolicy({
      approvalTtlMs: 1,
      protected: true,
      requiredApprovals: 0,
      reviewerIds: [],
      separateAuthorAndReviewer: true
    })
  ).toThrow(RangeError);
  const document = freezeDocument({ nested: { value: true } });
  expect(Object.isFrozen(document)).toBe(true);
  expect(Object.isFrozen(document["nested"])).toBe(true);
});

it("canonicalizes requests and constructs accepted results", () => {
  expect(requestFingerprint({ a: 1, b: 2 })).toBe(requestFingerprint({ b: 2, a: 1 }));
  expect(accepted({ revision: "r1" })).toEqual({
    status: "accepted",
    value: { revision: "r1" }
  });
});
