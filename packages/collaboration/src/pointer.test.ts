import { expect, it } from "vitest";

import {
  arrayParent,
  changedPaths,
  decodePointer,
  isSafePatchPointer,
  pointersOverlap,
  targetsFrameworkOwnedIdentity
} from "./pointer.js";
import { CollaborationPatchOperationType } from "./types.js";

it("decodes safe RFC 6901 pointers and identifies overlap", () => {
  expect(decodePointer("/view/children/0/props/a~1b")).toEqual([
    "view",
    "children",
    "0",
    "props",
    "a/b"
  ]);
  expect(pointersOverlap("/view/children", "/view/children/0/label")).toBe(true);
  expect(pointersOverlap("/view/title", "/view/help")).toBe(false);
  expect(arrayParent("/view/children/2")).toBe("/view/children");
});

it("rejects unsafe pointers and protects server revision and stable IDs", () => {
  expect(isSafePatchPointer("/view/__proto__/polluted")).toBe(false);
  expect(isSafePatchPointer("/view/~2invalid")).toBe(false);
  expect(targetsFrameworkOwnedIdentity("/view/id")).toBe(true);
  expect(targetsFrameworkOwnedIdentity("/revision")).toBe(true);
  expect(
    changedPaths([
      { op: CollaborationPatchOperationType.Test, path: "/view/title", value: "old" },
      { op: CollaborationPatchOperationType.Replace, path: "/view/title", value: "new" }
    ])
  ).toEqual(["/view/title"]);
});

it("handles pointer boundaries, escaped tokens, structural parents, and invalid overlap", () => {
  expect(decodePointer("")).toBeUndefined();
  expect(decodePointer("view/title")).toBeUndefined();
  expect(decodePointer(`/${"x".repeat(1_024)}`)).toBeUndefined();
  expect(decodePointer(`/${Array.from({ length: 65 }, () => "x").join("/")}`)).toBeUndefined();
  expect(decodePointer("/a~0b")).toEqual(["a~b"]);
  expect(arrayParent("/view/title")).toBeUndefined();
  expect(arrayParent("/view/children/-")).toBe("/view/children");
  expect(pointersOverlap("invalid", "/view")).toBe(true);
  expect(targetsFrameworkOwnedIdentity("/")).toBe(false);
  expect(
    changedPaths([
      { from: "/a", op: CollaborationPatchOperationType.Copy, path: "/b" },
      { op: CollaborationPatchOperationType.Remove, path: "/a" }
    ])
  ).toEqual(["/a", "/b"]);
});
