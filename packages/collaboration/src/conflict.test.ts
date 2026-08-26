import { expect, it } from "vitest";

import { collaborationConflicts } from "./conflict.js";
import { revision } from "./reference.test-data.js";
import {
  CollaborationConflictKind,
  CollaborationPatchOperationType,
  type CollaborationPatchOperation
} from "./types.js";

it("permits disjoint paths and classifies same, delete, semantic, and array conflicts", () => {
  const current = revision({ changedPaths: ["/view/help"], removedPaths: [] });
  expect(collaborationConflicts("r1", "r2", [replace("/view/title")], [current])).toEqual([]);
  expect(kinds([replace("/view/help")], current)).toEqual([
    CollaborationConflictKind.Accessibility
  ]);
  expect(kinds([replace("/semantics/name")], revisionAt("/semantics/name"))).toEqual([
    CollaborationConflictKind.Semantics
  ]);
  expect(kinds([replace("/machines/save/initial")], revisionAt("/machines/save"))).toEqual([
    CollaborationConflictKind.Machine
  ]);
  expect(kinds([replace("/policy/publish")], revisionAt("/policy/publish"))).toEqual([
    CollaborationConflictKind.Policy
  ]);
  expect(kinds([replace("/metadata/version")], revisionAt("/metadata/version"))).toEqual([
    CollaborationConflictKind.SamePath
  ]);
  expect(
    kinds([replace("/view/content/text")], revisionAt("/view/content", ["/view/content"]))
  ).toEqual([CollaborationConflictKind.DeleteEdit]);
  const add = { op: CollaborationPatchOperationType.Add, path: "/view/children/1", value: {} };
  expect(kinds([add], revisionAt("/view/children"))).toEqual([
    CollaborationConflictKind.AncestorOverlap
  ]);
});

function kinds(
  operations: readonly CollaborationPatchOperation[],
  current: ReturnType<typeof revision>
) {
  return collaborationConflicts("r1", "r2", operations, [current]).map((item) => item.kind);
}

function replace(path: string): CollaborationPatchOperation {
  return { op: CollaborationPatchOperationType.Replace, path, value: "updated" };
}

function revisionAt(path: string, removedPaths: readonly string[] = []) {
  return revision({ changedPaths: [path], removedPaths });
}
