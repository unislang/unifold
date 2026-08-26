import { expect, it } from "vitest";

import { afterDocument, beforeDocument } from "./devtools.test-data.js";
import { createDocumentDiff, documentFingerprint } from "./diff.js";

it("creates an immutable deterministic document diff with SHA-256 fingerprints", async () => {
  const diff = await createDocumentDiff(beforeDocument, afterDocument);
  expect(diff.beforeFingerprint).toHaveLength(64);
  expect(diff.afterFingerprint).toHaveLength(64);
  expect(diff.beforeFingerprint).not.toContain("Before");
  expect(diff.operations.map(({ path }) => path)).toEqual([
    "/revision",
    "/view/help",
    "/view/title"
  ]);
  expect(Object.isFrozen(diff.operations)).toBe(true);
  await expect(documentFingerprint({ b: 2, a: 1 })).resolves.toBe(
    await documentFingerprint({ a: 1, b: 2 })
  );
});
