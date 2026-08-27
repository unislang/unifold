import { UiCollectionOperationType } from "@unislang/unifold-contracts";
import {
  UiCommandType,
  type UiCollectionReconcileMetadata,
  type UiNodeSnapshot
} from "@unislang/unifold-events";
import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import type { DomRenderController } from "@unislang/unifold-renderer-dom";
import type { UiExecutionContext, UnifoldRuntime } from "@unislang/unifold-runtime";

import type { UiCompositionMigrationPlan } from "./composition-migrations.js";

type IndexedCollectionRemoval = UiCollectionReconcileMetadata & { readonly fromIndex: number };

export function focusedNodeId(nodes: readonly UiNodeSnapshot[]): string | undefined {
  return nodes.find(({ base }) => base.focused)?.id;
}

export function migratedFocusedNodeId(
  nodes: readonly UiNodeSnapshot[],
  migration: UiCompositionMigrationPlan
): string | undefined {
  const focused = focusedNodeId(nodes);
  return focused === undefined ? undefined : migratedTarget(focused, migration);
}

export function collectionFocusTarget(
  previousNodes: readonly UiNodeSnapshot[],
  next: UnifoldIrDocument,
  collection: UiCollectionReconcileMetadata | undefined
): string | undefined {
  const focused = focusedNodeId(previousNodes);
  if (focused === undefined) return undefined;
  if (next.nodesById[focused] !== undefined) return undefined;
  return removedCollectionFocusTarget(focused, previousNodes, next, collection);
}

export function restoreApplicationFocus(
  runtime: UnifoldRuntime,
  renderer: DomRenderController,
  nodes: readonly UiNodeSnapshot[],
  migration: UiCompositionMigrationPlan,
  collectionTarget: string | undefined,
  context: UiExecutionContext | undefined
): void {
  if (collectionTarget !== undefined) {
    runtime.execute([{ id: collectionTarget, type: UiCommandType.FocusRequest }], context);
    return;
  }
  restoreFocus(renderer, migratedFocusedNodeId(nodes, migration));
}

export function focusExecutionContext(reconciliation: {
  readonly correlationId: string;
  readonly id: string;
}): UiExecutionContext {
  return { causationId: reconciliation.id, correlationId: reconciliation.correlationId };
}

export function requireAvailableFocusTarget(
  runtime: UnifoldRuntime,
  document: UnifoldIrDocument,
  targetId: string | undefined
): void {
  if (targetId === undefined) return;
  if (focusableRuntimeNode(runtime, document, targetId)) return;
  throw new Error(`Collection focus target is unavailable: ${targetId}.`);
}

export function restoreFocus(renderer: DomRenderController, nodeId: string | undefined): void {
  if (nodeId === undefined) return;
  void renderer.restoreFocus(nodeId);
}

function migratedTarget(
  focused: string,
  migration: UiCompositionMigrationPlan
): string | undefined {
  return Object.entries(migration.nodeIdentityAliases).find(
    ([, source]) => source === focused
  )?.[0];
}

function removedCollectionFocusTarget(
  focused: string,
  previousNodes: readonly UiNodeSnapshot[],
  next: UnifoldIrDocument,
  collection: UiCollectionReconcileMetadata | undefined
): string | undefined {
  const removal = indexedRemoval(collection);
  if (removal === undefined) return undefined;
  const nodes = nodeRecord(previousNodes);
  if (!removedMemberWasFocused(focused, removal, nodes)) return undefined;
  return survivingCollectionTarget(next, removal.collectionId, removal.fromIndex);
}

function emptyFocusTargetId(document: UnifoldIrDocument, collectionId: string): string | undefined {
  if (!Object.hasOwn(document.collectionBehaviorsById, collectionId)) return undefined;
  return document.collectionBehaviorsById[collectionId]?.emptyFocusTargetId;
}

function indexedRemoval(
  collection: UiCollectionReconcileMetadata | undefined
): IndexedCollectionRemoval | undefined {
  if (collection === undefined) return undefined;
  if (collection.type !== UiCollectionOperationType.Remove) return undefined;
  return removalWithIndex(collection);
}

function removalWithIndex(
  collection: UiCollectionReconcileMetadata
): IndexedCollectionRemoval | undefined {
  if (collection.fromIndex === undefined) return undefined;
  return collection as IndexedCollectionRemoval;
}

function removedMemberWasFocused(
  focused: string,
  removal: IndexedCollectionRemoval,
  nodes: Readonly<Record<string, UiNodeSnapshot>>
): boolean {
  const removed = removedMemberId(removal, nodes);
  if (removed === undefined) return false;
  return belongsToMember(focused, removed, nodes);
}

function removedMemberId(
  removal: IndexedCollectionRemoval,
  nodes: Readonly<Record<string, UiNodeSnapshot>>
): string | undefined {
  const collection = nodes[removal.collectionId];
  if (collection === undefined) return undefined;
  return collection.controlChildIds?.[removal.fromIndex];
}

function survivingCollectionTarget(
  next: UnifoldIrDocument,
  collectionId: string,
  removedIndex: number
): string | undefined {
  const collection = next.nodesById[collectionId];
  if (collection === undefined) return undefined;
  return targetFromChildren(
    collection.controlChildIds ?? [],
    removedIndex,
    availableFallback(next, emptyFocusTargetId(next, collectionId))
  );
}

function targetFromChildren(
  children: readonly string[],
  removedIndex: number,
  fallbackId: string | undefined
): string | undefined {
  if (children.length === 0) return fallbackId;
  return children[Math.min(removedIndex, children.length - 1)];
}

function availableFallback(
  next: UnifoldIrDocument,
  fallbackId: string | undefined
): string | undefined {
  if (fallbackId === undefined) return undefined;
  return next.nodesById[fallbackId] === undefined ? undefined : fallbackId;
}

function focusableRuntimeNode(
  runtime: UnifoldRuntime,
  document: UnifoldIrDocument,
  rootId: string
): boolean {
  const pending = [rootId];
  for (const id of pending) {
    if (isRuntimeFocusDestination(runtime, document, id)) return true;
    pending.push(...runtimeNodeChildren(document, id));
  }
  return false;
}

function isRuntimeFocusDestination(
  runtime: UnifoldRuntime,
  document: UnifoldIrDocument,
  id: string
): boolean {
  if (document.nodesById[id] === undefined) return false;
  return isAvailableFocusBase(runtime.getSnapshot(id).base);
}

function isAvailableFocusBase(base: UiNodeSnapshot["base"]): boolean {
  return [base.interactive, !base.disabled, base.visible].every(Boolean);
}

function runtimeNodeChildren(document: UnifoldIrDocument, id: string): readonly string[] {
  const node = document.nodesById[id];
  return node === undefined ? [] : node.childIds;
}

function belongsToMember(
  focused: string,
  member: string,
  nodes: Readonly<Record<string, UiNodeSnapshot>>
): boolean {
  if (focused === member) return true;
  return (
    followsAncestry(focused, member, nodes, "controlParentId") ||
    followsAncestry(focused, member, nodes, "parentId")
  );
}

function followsAncestry(
  start: string,
  target: string,
  nodes: Readonly<Record<string, UiNodeSnapshot>>,
  relation: "controlParentId" | "parentId"
): boolean {
  return ancestry(start, nodes, relation).includes(target);
}

function ancestry(
  start: string,
  nodes: Readonly<Record<string, UiNodeSnapshot>>,
  relation: "controlParentId" | "parentId"
): readonly string[] {
  const ids: string[] = [];
  const visited = new Set<string>();
  let current: string | undefined = start;
  while (current !== undefined) {
    if (visited.has(current)) return ids;
    ids.push(current);
    visited.add(current);
    current = relatedNodeId(nodes[current], relation);
  }
  return ids;
}

function relatedNodeId(
  node: UiNodeSnapshot | undefined,
  relation: "controlParentId" | "parentId"
): string | undefined {
  if (node === undefined) return undefined;
  return node[relation];
}

function nodeRecord(nodes: readonly UiNodeSnapshot[]): Readonly<Record<string, UiNodeSnapshot>> {
  return Object.fromEntries(nodes.map((node) => [node.id, node]));
}
