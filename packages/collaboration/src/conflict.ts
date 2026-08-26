import { arrayParent, operationPaths, pointersOverlap } from "./pointer.js";
import {
  CollaborationConflictKind,
  CollaborationPatchOperationType,
  type CollaborationConflict,
  type CollaborationPatchOperation,
  type CollaborationRevision
} from "./types.js";

export function collaborationConflicts(
  baseRevision: string,
  currentRevision: string,
  operations: readonly CollaborationPatchOperation[],
  intervening: readonly CollaborationRevision[]
): readonly CollaborationConflict[] {
  const conflicts = operations.flatMap((operation) =>
    operationConflicts(baseRevision, currentRevision, operation, intervening)
  );
  return uniqueConflicts(conflicts);
}

function operationConflicts(
  baseRevision: string,
  currentRevision: string,
  operation: CollaborationPatchOperation,
  intervening: readonly CollaborationRevision[]
): readonly CollaborationConflict[] {
  const proposed = conflictFootprints(operation);
  return intervening.flatMap((revision) =>
    revision.changedPaths.flatMap((currentPath) =>
      proposed
        .filter((proposalPath) => pointersOverlap(proposalPath, currentPath))
        .map((proposalPath) =>
          conflict(baseRevision, currentRevision, proposalPath, currentPath, operation, revision)
        )
    )
  );
}

function conflictFootprints(operation: CollaborationPatchOperation): readonly string[] {
  const paths = operationPaths(operation);
  if (!isStructural(operation)) return paths;
  return [...new Set(paths.flatMap((path) => [path, arrayParent(path)].filter(isString)))];
}

function conflict(
  baseRevision: string,
  currentRevision: string,
  proposalPath: string,
  currentPath: string,
  operation: CollaborationPatchOperation,
  revision: CollaborationRevision
): CollaborationConflict {
  return {
    baseRevision,
    currentPath,
    currentRevision,
    kind: conflictKind(proposalPath, currentPath, operation, revision),
    proposalPath
  };
}

function conflictKind(
  proposalPath: string,
  currentPath: string,
  operation: CollaborationPatchOperation,
  revision: CollaborationRevision
): CollaborationConflictKind {
  const sensitive = sensitiveKind(proposalPath, currentPath);
  if (sensitive !== undefined) return sensitive;
  return ordinaryConflictKind(proposalPath, currentPath, operation, revision);
}

function ordinaryConflictKind(
  proposalPath: string,
  currentPath: string,
  operation: CollaborationPatchOperation,
  revision: CollaborationRevision
): CollaborationConflictKind {
  if (isDeleteEdit(proposalPath, currentPath, operation, revision)) {
    return CollaborationConflictKind.DeleteEdit;
  }
  return proposalPath === currentPath
    ? CollaborationConflictKind.SamePath
    : CollaborationConflictKind.AncestorOverlap;
}

function sensitiveKind(left: string, right: string): CollaborationConflictKind | undefined {
  const path = `${left} ${right}`.toLowerCase();
  const match = sensitivePatterns.find(([pattern]) => pattern.test(path));
  return match?.[1];
}

const sensitivePatterns: readonly (readonly [RegExp, CollaborationConflictKind])[] = [
  [/\/machines?(?:\/|\s|$)/u, CollaborationConflictKind.Machine],
  [/\/semantics?(?:\/|\s|$)/u, CollaborationConflictKind.Semantics],
  [/\/(?:aria|label|description|help)(?:\/|\s|$)/u, CollaborationConflictKind.Accessibility],
  [/\/(?:stores|rules|access|policy)(?:\/|\s|$)/u, CollaborationConflictKind.Policy]
];

function isDeleteEdit(
  proposalPath: string,
  currentPath: string,
  operation: CollaborationPatchOperation,
  revision: CollaborationRevision
): boolean {
  if (operation.op === CollaborationPatchOperationType.Remove) return true;
  return revision.removedPaths.some(
    (removed) => pointersOverlap(removed, proposalPath) || pointersOverlap(removed, currentPath)
  );
}

function isStructural(operation: CollaborationPatchOperation): boolean {
  return [
    CollaborationPatchOperationType.Add,
    CollaborationPatchOperationType.Copy,
    CollaborationPatchOperationType.Move,
    CollaborationPatchOperationType.Remove
  ].includes(operation.op);
}

function uniqueConflicts(
  values: readonly CollaborationConflict[]
): readonly CollaborationConflict[] {
  const unique: CollaborationConflict[] = [];
  for (const value of values) mergeConflict(unique, value);
  return unique;
}

function mergeConflict(unique: CollaborationConflict[], value: CollaborationConflict): void {
  const index = unique.findIndex((current) => sameConflictArea(current, value));
  if (index < 0) return void unique.push(value);
  replaceWithDeeperConflict(unique, index, value);
}

function sameConflictArea(left: CollaborationConflict, right: CollaborationConflict): boolean {
  return [
    left.currentPath === right.currentPath,
    pointersOverlap(left.proposalPath, right.proposalPath)
  ].every(Boolean);
}

function replaceWithDeeperConflict(
  unique: CollaborationConflict[],
  index: number,
  value: CollaborationConflict
): void {
  const existing = unique[index];
  const deeper = existing !== undefined && value.proposalPath.length > existing.proposalPath.length;
  if (deeper) {
    unique[index] = value;
  }
}

function isString(value: string | undefined): value is string {
  return value !== undefined;
}
