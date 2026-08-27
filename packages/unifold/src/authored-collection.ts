import { get } from "@sagold/json-pointer";
import {
  UiCollectionOperationType,
  type JsonObject,
  type JsonValue
} from "@unislang/unifold-contracts";
import type { UiCollectionReconcileMetadata } from "@unislang/unifold-events";
import { applyPatch, type Operation } from "rfc6902";

interface UnifoldCollectionOperationBase {
  readonly collectionId: string;
  readonly expectedRevision: string;
  readonly revision: string;
}

export interface UnifoldCollectionInsertOperation extends UnifoldCollectionOperationBase {
  readonly index: number;
  readonly item: JsonObject;
  readonly type: UiCollectionOperationType.Insert;
}

export interface UnifoldCollectionMoveOperation extends UnifoldCollectionOperationBase {
  readonly index: number;
  readonly key: string | number;
  readonly type: UiCollectionOperationType.Move;
}

export interface UnifoldCollectionRemoveOperation extends UnifoldCollectionOperationBase {
  readonly key: string | number;
  readonly type: UiCollectionOperationType.Remove;
}

export type UnifoldCollectionOperation =
  | UnifoldCollectionInsertOperation
  | UnifoldCollectionMoveOperation
  | UnifoldCollectionRemoveOperation;

export class UnifoldCollectionOperationError extends Error {
  constructor(
    readonly code: string,
    readonly path: string,
    message: string
  ) {
    super(message);
    this.name = "UnifoldCollectionOperationError";
  }
}

export interface AuthoredCollectionCandidate {
  readonly authored: unknown;
  readonly metadata: UiCollectionReconcileMetadata;
}

interface AuthoredCollectionSource {
  readonly authored: unknown;
  readonly collectionsById: Readonly<
    Record<string, { readonly keyProperty: string; readonly sourcePointer: string }>
  >;
}

export function createAuthoredCollectionCandidate(
  source: AuthoredCollectionSource,
  operation: UnifoldCollectionOperation
): AuthoredCollectionCandidate {
  validateOperationType(operation);
  const document = requireDocument(source.authored);
  const definition = requireCollectionDefinition(source, operation.collectionId);
  validateRevision(operation, document);
  const collection = requireCollection(document, definition.sourcePointer);
  const key = operationKey(operation, definition.keyProperty);
  const currentIndex = keyedIndex(collection, definition.keyProperty, key);
  validateCollectionAction(collection, currentIndex, operation);
  const candidate = structuredClone(document);
  applyOperations(candidate, patchOperations(operation, definition.sourcePointer, currentIndex));
  return { authored: candidate, metadata: operationMetadata(operation, currentIndex) };
}

function requireDocument(value: unknown): JsonObject {
  if (!isPlainObject(value)) fail("invalid-document", "/", "Authored UI must be a JSON object.");
  return value as JsonObject;
}

function requireCollectionDefinition(source: AuthoredCollectionSource, id: string) {
  if (!Object.hasOwn(source.collectionsById, id)) {
    fail("collection-not-found", "/collectionId", "Compiled collection was not found.");
  }
  const definition = source.collectionsById[id];
  if (definition === undefined) {
    fail("collection-not-found", "/collectionId", "Compiled collection was not found.");
  }
  return definition;
}

function validateOperationType(operation: UnifoldCollectionOperation): void {
  if (Object.values(UiCollectionOperationType).includes(operation.type)) return;
  fail("invalid-collection-operation", "/type", "Collection operation type is invalid.");
}

function validateRevision(operation: UnifoldCollectionOperation, document: JsonObject): void {
  if (document["revision"] !== operation.expectedRevision) {
    fail("collection-revision-conflict", "/expectedRevision", "Authored revision has changed.");
  }
  if (isInvalidRevision(operation)) {
    fail("invalid-collection-revision", "/revision", "A new non-empty revision is required.");
  }
}

function isInvalidRevision(operation: UnifoldCollectionOperation): boolean {
  return operation.revision.length === 0 || operation.revision === operation.expectedRevision;
}

function requireCollection(document: JsonObject, path: string): JsonValue[] {
  const value = get(document, path);
  if (!Array.isArray(value)) {
    fail("collection-not-found", "/collectionId", "Compiled collection is not an authored array.");
  }
  return value as JsonValue[];
}

function operationKey(operation: UnifoldCollectionOperation, keyProperty: string): string | number {
  const value =
    operation.type === UiCollectionOperationType.Insert
      ? itemKey(operation.item, keyProperty)
      : operation.key;
  if (!isDurableKey(value)) fail("invalid-collection-key", "/key", "Collection key is invalid.");
  return value;
}

function keyedIndex(
  collection: readonly JsonValue[],
  keyProperty: string,
  key: string | number
): number {
  return collection.findIndex((item) => itemKey(item, keyProperty) === key);
}

function validateCollectionAction(
  collection: readonly JsonValue[],
  currentIndex: number,
  operation: UnifoldCollectionOperation
): void {
  if (operation.type === UiCollectionOperationType.Insert) {
    validateInsert(collection, currentIndex, operation.index);
    return;
  }
  validateExistingAction(collection, currentIndex, operation);
}

function validateExistingAction(
  collection: readonly JsonValue[],
  currentIndex: number,
  operation: UnifoldCollectionMoveOperation | UnifoldCollectionRemoveOperation
): void {
  if (currentIndex < 0) fail("collection-key-not-found", "/key", "Collection key was not found.");
  if (operation.type === UiCollectionOperationType.Move) {
    validateIndex(operation.index, collection.length - 1);
  }
}

function validateInsert(
  collection: readonly JsonValue[],
  currentIndex: number,
  index: number
): void {
  if (currentIndex >= 0)
    fail("duplicate-collection-key", "/item", "Collection key already exists.");
  validateIndex(index, collection.length);
}

function validateIndex(index: number, maximum: number): void {
  if (!isValidIndex(index, maximum)) {
    fail("invalid-collection-index", "/index", "Collection index is outside the allowed range.");
  }
}

function isValidIndex(index: number, maximum: number): boolean {
  return Number.isInteger(index) && index >= 0 && index <= maximum;
}

function patchOperations(
  operation: UnifoldCollectionOperation,
  path: string,
  currentIndex: number
): readonly Operation[] {
  const revision = { op: "replace", path: "/revision", value: operation.revision } as Operation;
  const target = `${path}/${String(targetIndex(operation))}`;
  if (operation.type === UiCollectionOperationType.Insert) {
    return [{ op: "add", path: target, value: operation.item } as Operation, revision];
  }
  if (operation.type === UiCollectionOperationType.Move) {
    return [{ from: `${path}/${String(currentIndex)}`, op: "move", path: target }, revision];
  }
  return [{ op: "remove", path: `${path}/${String(currentIndex)}` } as Operation, revision];
}

function targetIndex(operation: UnifoldCollectionOperation): number {
  return operation.type === UiCollectionOperationType.Remove ? 0 : operation.index;
}

function operationMetadata(
  operation: UnifoldCollectionOperation,
  currentIndex: number
): UiCollectionReconcileMetadata {
  if (operation.type === UiCollectionOperationType.Insert) {
    return { collectionId: operation.collectionId, toIndex: operation.index, type: operation.type };
  }
  if (operation.type === UiCollectionOperationType.Move) {
    return {
      collectionId: operation.collectionId,
      fromIndex: currentIndex,
      toIndex: operation.index,
      type: operation.type
    };
  }
  return { collectionId: operation.collectionId, fromIndex: currentIndex, type: operation.type };
}

function applyOperations(candidate: JsonObject, operations: readonly Operation[]): void {
  try {
    const failure = applyPatch(candidate, [...operations]).find((result) => result !== null);
    if (failure !== undefined) throw failure;
  } catch {
    fail("collection-patch-failed", "/", "Collection operation could not be applied.");
  }
}

function itemKey(value: JsonValue, property: string): JsonValue | undefined {
  if (!isPlainObject(value) || !Object.hasOwn(value, property)) return undefined;
  return value[property];
}

function isPlainObject(value: unknown): value is JsonObject {
  if (!isObject(value)) return false;
  return !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function isObject(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

function isDurableKey(value: unknown): value is string | number {
  if (typeof value === "number") return Number.isSafeInteger(value);
  if (typeof value !== "string") return false;
  return isDurableStringKey(value);
}

function isDurableStringKey(value: string): boolean {
  return value.length > 0 && value.length <= 128;
}

function fail(code: string, path: string, message: string): never {
  throw new UnifoldCollectionOperationError(code, path, message);
}
