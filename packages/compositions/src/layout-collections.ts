import {
  ComponentProgrammaticFocusBehavior,
  componentProgrammaticFocusBehavior
} from "@unislang/unifold-catalog";
import { UiCollectionBehaviorVersion, type JsonObject } from "@unislang/unifold-contracts";

import { CompositionDiagnosticCode } from "./enums.js";
import { addLayoutDiagnostic, isSafeLayoutName } from "./layout-values.js";
import type { CompositionDiagnostic, LayoutCollectionDefinition } from "./types.js";

export interface LayoutRepeatDefinition {
  readonly alias: string;
  readonly collection?: string;
  readonly emptyFocusTargetId?: string;
  readonly key: string;
  readonly reference: string;
}

const REPEAT_PATTERN =
  /^([A-Za-z][A-Za-z0-9_-]*) in \{\{([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*)\}\}$/u;

export function registerLayoutCollection(
  name: string | undefined,
  keyProperty: string,
  emptyFocusTargetId: string | undefined,
  sourcePointer: string,
  path: string,
  definitions: Record<string, LayoutCollectionDefinition>,
  diagnostics: CompositionDiagnostic[]
): boolean {
  if (name === undefined) return true;
  return registerNamedLayoutCollection(
    name,
    keyProperty,
    emptyFocusTargetId,
    sourcePointer,
    path,
    definitions,
    diagnostics
  );
}

function registerNamedLayoutCollection(
  name: string,
  keyProperty: string,
  emptyFocusTargetId: string | undefined,
  sourcePointer: string,
  path: string,
  definitions: Record<string, LayoutCollectionDefinition>,
  diagnostics: CompositionDiagnostic[]
): boolean {
  if (
    !sourcePointer.startsWith("/variables/") ||
    collectionAuthorityExists(definitions, name, sourcePointer)
  )
    return rejectLayoutCollection(path, diagnostics);
  definitions[name] = {
    controlId: name,
    declarationPointer: `${path}/collection`,
    ...optionalEmptyFocusTarget(emptyFocusTargetId, path),
    keyProperty,
    sourcePointer
  };
  return true;
}

function optionalEmptyFocusTarget(emptyFocusTargetId: string | undefined, path: string) {
  return emptyFocusTargetId === undefined
    ? {}
    : {
        emptyFocusTargetId,
        emptyFocusTargetPointer: `${path}/emptyFocusTarget`
      };
}

function collectionAuthorityExists(
  definitions: Record<string, LayoutCollectionDefinition>,
  name: string,
  sourcePointer: string
): boolean {
  if (Object.hasOwn(definitions, name)) return true;
  return Object.values(definitions).some(
    (definition) => definition.sourcePointer === sourcePointer
  );
}

export function parseLayoutRepeat(
  value: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompositionDiagnostic[]
): LayoutRepeatDefinition | undefined {
  const match = repeatMatch(value["for"], path, diagnostics);
  if (match === undefined) return undefined;
  return matchedRepeat(value, match, path, diagnostics);
}

function matchedRepeat(
  value: Readonly<Record<string, unknown>>,
  match: RegExpExecArray,
  path: string,
  diagnostics: CompositionDiagnostic[]
): LayoutRepeatDefinition | undefined {
  const key = value["key"];
  if (!isSafeLayoutName(key)) return rejectLayoutRepeat(path, diagnostics);
  return repeatWithCollection(
    value["collection"],
    value["emptyFocusTarget"],
    match,
    key,
    path,
    diagnostics
  );
}

function repeatWithCollection(
  collection: unknown,
  emptyFocusTarget: unknown,
  match: RegExpExecArray,
  key: string,
  path: string,
  diagnostics: CompositionDiagnostic[]
): LayoutRepeatDefinition | undefined {
  const base = { alias: match[1] as string, key, reference: match[2] as string };
  if (collection === undefined)
    return repeatWithoutCollection(base, emptyFocusTarget, path, diagnostics);
  if (!isSafeLayoutName(collection)) return invalidCollectionRepeat(path, diagnostics);
  return namedCollectionRepeat(base, collection, emptyFocusTarget, path, diagnostics);
}

function namedCollectionRepeat(
  base: Omit<LayoutRepeatDefinition, "collection" | "emptyFocusTargetId">,
  collection: string,
  emptyFocusTarget: unknown,
  path: string,
  diagnostics: CompositionDiagnostic[]
): LayoutRepeatDefinition | undefined {
  if (emptyFocusTarget === undefined) return { ...base, collection };
  if (!isSafeLayoutName(emptyFocusTarget)) return rejectLayoutEmptyFocusTarget(path, diagnostics);
  return { ...base, collection, emptyFocusTargetId: emptyFocusTarget };
}

function invalidCollectionRepeat(path: string, diagnostics: CompositionDiagnostic[]): undefined {
  rejectLayoutCollection(path, diagnostics);
  return undefined;
}

function repeatWithoutCollection(
  base: Omit<LayoutRepeatDefinition, "collection" | "emptyFocusTargetId">,
  emptyFocusTarget: unknown,
  path: string,
  diagnostics: CompositionDiagnostic[]
): LayoutRepeatDefinition | undefined {
  if (emptyFocusTarget !== undefined) return rejectLayoutEmptyFocusTarget(path, diagnostics);
  return base;
}

function repeatMatch(
  value: unknown,
  path: string,
  diagnostics: CompositionDiagnostic[]
): RegExpExecArray | undefined {
  if (typeof value !== "string") return rejectLayoutRepeat(path, diagnostics);
  const match = REPEAT_PATTERN.exec(value);
  if (match === null) return rejectLayoutRepeat(path, diagnostics);
  return match;
}

function rejectLayoutRepeat(path: string, diagnostics: CompositionDiagnostic[]): undefined {
  addLayoutDiagnostic(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayoutNode,
    `${path}/for`,
    "Node for requires 'item in {{items}}' and a safe key."
  );
  return undefined;
}

export function rejectLayoutCollection(path: string, diagnostics: CompositionDiagnostic[]): false {
  addLayoutDiagnostic(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayoutNode,
    `${path}/collection`,
    "Collection must uniquely name a repeat over an authored variable."
  );
  return false;
}

export function rejectLayoutEmptyFocusTarget(
  path: string,
  diagnostics: CompositionDiagnostic[]
): undefined {
  addLayoutDiagnostic(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayoutNode,
    `${path}/emptyFocusTarget`,
    "emptyFocusTarget requires a named collection and one stable node ID."
  );
  return undefined;
}

export function validateLayoutCollectionFocusTargets(
  view: JsonObject,
  state: {
    readonly collectionsById: Readonly<Record<string, LayoutCollectionDefinition>>;
  },
  diagnostics: CompositionDiagnostic[]
): boolean {
  const initialCount = diagnostics.length;
  Object.values(state.collectionsById).forEach((definition) =>
    validateEmptyFocusTarget(view, definition, diagnostics)
  );
  return diagnostics.length === initialCount;
}

function validateEmptyFocusTarget(
  view: JsonObject,
  definition: LayoutCollectionDefinition,
  diagnostics: CompositionDiagnostic[]
): void {
  const targetId = definition.emptyFocusTargetId;
  if (targetId === undefined) return;
  const target = findNode(view, targetId);
  if (isValidEmptyFocusTarget(target, targetId, definition.controlId)) return;
  addLayoutDiagnostic(
    diagnostics,
    CompositionDiagnosticCode.InvalidLayoutNode,
    emptyFocusDiagnosticPointer(definition),
    `Collection emptyFocusTarget "${targetId}" must identify a stable focusable node.`
  );
}

function emptyFocusDiagnosticPointer(definition: LayoutCollectionDefinition): string {
  return definition.emptyFocusTargetPointer ?? definition.declarationPointer;
}

function isValidEmptyFocusTarget(
  target: JsonObject | undefined,
  targetId: string,
  collectionId: string
): boolean {
  if (target === undefined) return false;
  if (targetId === collectionId) return false;
  return hasFocusDestination(target);
}

function findNode(root: JsonObject, id: string): JsonObject | undefined {
  const pending: JsonObject[] = [root];
  for (const node of pending) {
    if (node["id"] === id) return node;
    pending.push(...nodeChildren(node));
  }
  return undefined;
}

function hasFocusDestination(root: JsonObject): boolean {
  const pending: JsonObject[] = [root];
  for (const node of pending) {
    if (isEnabledFocusComponent(node)) return true;
    pending.push(...nodeChildren(node));
  }
  return false;
}

function nodeChildren(node: JsonObject): JsonObject[] {
  const children = node["$children"];
  if (!Array.isArray(children)) return [];
  return children.filter(isJsonObject);
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isEnabledFocusComponent(node: JsonObject): boolean {
  if (node["disabled"] === true) return false;
  const componentType = node["$comp"];
  if (typeof componentType !== "string") return false;
  return (
    componentProgrammaticFocusBehavior(componentType) ===
    ComponentProgrammaticFocusBehavior.FirstFocusableDescendant
  );
}

export function layoutCollectionBehaviorField(
  definitions: Readonly<Record<string, LayoutCollectionDefinition>>
): JsonObject {
  const nodes = Object.entries(definitions)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([collectionId, definition]) =>
      definition.emptyFocusTargetId === undefined
        ? []
        : [{ collectionId, emptyFocusTargetId: definition.emptyFocusTargetId }]
    );
  return nodes.length === 0
    ? {}
    : { collectionBehaviors: { contractVersion: UiCollectionBehaviorVersion.Version1, nodes } };
}
