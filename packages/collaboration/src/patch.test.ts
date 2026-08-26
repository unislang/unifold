import { expect, it } from "vitest";

import { initialDocument } from "./collaboration.test-data.js";
import { applyCollaborationPatch } from "./patch.js";
import {
  CollaborationErrorCode,
  CollaborationPatchOperationType,
  type CollaborationValidationPort
} from "./types.js";

const accepts: CollaborationValidationPort = { validate: () => [] };

it("applies a patch to a frozen defensive revision without changing its source", () => {
  const source = initialDocument();
  const result = applyCollaborationPatch(
    source,
    [{ op: CollaborationPatchOperationType.Replace, path: "/view/title", value: "Updated" }],
    "revision-2",
    accepts
  );
  expect(result.success).toBe(true);
  if (!result.success) return;
  expect(result.document["revision"]).toBe("revision-2");
  expect((result.document["view"] as { title: string }).title).toBe("Updated");
  expect(source.view.title).toBe("Original title");
  expect(Object.isFrozen(result.document)).toBe(true);
});

it("rejects framework-owned IDs, failed tests, and schema-invalid candidates", () => {
  const identity = applyCollaborationPatch(
    initialDocument(),
    [{ op: CollaborationPatchOperationType.Replace, path: "/view/id", value: "other" }],
    "revision-2",
    accepts
  );
  const failedTest = applyCollaborationPatch(
    initialDocument(),
    [{ op: CollaborationPatchOperationType.Test, path: "/view/title", value: "wrong" }],
    "revision-2",
    accepts
  );
  const schema = applyCollaborationPatch(
    initialDocument(),
    [{ op: CollaborationPatchOperationType.Replace, path: "/view/title", value: "Updated" }],
    "revision-2",
    { validate: () => [{ code: CollaborationErrorCode.SchemaRejected, messageKey: "invalid" }] }
  );
  expect(identity.success).toBe(false);
  expect(failedTest.success).toBe(false);
  expect(schema.success).toBe(false);
});
