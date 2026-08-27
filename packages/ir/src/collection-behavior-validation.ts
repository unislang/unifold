import { UiCollectionBehaviorVersion, UiControlNodeKind } from "@unislang/unifold-contracts";

import {
  collectionHasFocusDestination,
  collectionVisualNodeIndex
} from "./collection-behavior-visual.js";
import { errorDiagnostic } from "./diagnostics.js";
import { DiagnosticCode } from "./enums.js";
import { isPlainObject } from "./json-safety.js";
import type { CompilerDiagnostic } from "./types.js";

const MAXIMUM_BEHAVIORS = 10_000;
const definitionKeys = new Set(["contractVersion", "nodes"]);
const nodeKeys = new Set(["collectionId", "emptyFocusTargetId"]);
const aggregateKinds = new Set<unknown>([UiControlNodeKind.Array, UiControlNodeKind.Record]);

interface BehaviorCandidate {
  readonly collectionId: string;
  readonly emptyFocusTargetId: string;
  readonly path: string;
}

interface ValidationContext {
  readonly controls: unknown;
  readonly diagnostics: CompilerDiagnostic[];
  readonly seen: Set<string>;
  readonly visuals: ReturnType<typeof collectionVisualNodeIndex>;
}

export function validateCollectionBehaviors(
  value: unknown,
  controls: unknown,
  view: unknown,
  diagnostics: CompilerDiagnostic[]
): void {
  if (value === undefined) return;
  validateCollectionBehaviorValue(value, controls, view, diagnostics);
}

function validateCollectionBehaviorValue(
  value: unknown,
  controls: unknown,
  view: unknown,
  diagnostics: CompilerDiagnostic[]
): void {
  const definition = collectionBehaviorDefinition(value, diagnostics);
  if (definition === undefined) return;
  validateContractVersion(definition["contractVersion"], diagnostics);
  const nodes = collectionBehaviorNodes(definition["nodes"], diagnostics);
  if (nodes === undefined) return;
  const context = validationContext(controls, view, diagnostics);
  nodes.forEach((node, index) => validateBehaviorNode(node, index, context));
}
function validationContext(
  controls: unknown,
  view: unknown,
  diagnostics: CompilerDiagnostic[]
): ValidationContext {
  return { controls, diagnostics, seen: new Set(), visuals: collectionVisualNodeIndex(view) };
}
function collectionBehaviorDefinition(
  value: unknown,
  diagnostics: CompilerDiagnostic[]
): Readonly<Record<string, unknown>> | undefined {
  if (isPlainObject(value)) {
    validateExactKeys(value, definitionKeys, "/collectionBehaviors", diagnostics);
    return value;
  }
  add(diagnostics, "/collectionBehaviors", "Collection behaviors must be an object.");
  return undefined;
}
function validateContractVersion(value: unknown, diagnostics: CompilerDiagnostic[]): void {
  if (value === UiCollectionBehaviorVersion.Version1) return;
  add(
    diagnostics,
    "/collectionBehaviors/contractVersion",
    `Expected collection behavior version "${UiCollectionBehaviorVersion.Version1}".`
  );
}
function collectionBehaviorNodes(
  value: unknown,
  diagnostics: CompilerDiagnostic[]
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    add(diagnostics, "/collectionBehaviors/nodes", "Collection behavior nodes must be an array.");
    return undefined;
  }
  if (value.length > MAXIMUM_BEHAVIORS) addBehaviorLimit(diagnostics);
  return value.slice(0, MAXIMUM_BEHAVIORS);
}
function addBehaviorLimit(diagnostics: CompilerDiagnostic[]): void {
  add(
    diagnostics,
    "/collectionBehaviors/nodes",
    `Collection behaviors cannot exceed ${String(MAXIMUM_BEHAVIORS)} nodes.`
  );
}
function validateBehaviorNode(value: unknown, index: number, context: ValidationContext): void {
  const path = `/collectionBehaviors/nodes/${String(index)}`;
  const node = behaviorNode(value, path, context.diagnostics);
  if (node === undefined) return;
  const candidate = behaviorCandidate(node, path, context.diagnostics);
  if (candidate === undefined) return;
  validateUniqueCollection(candidate, context);
  validateCollectionAuthority(candidate, context);
  validateFocusTarget(candidate, context);
}
function behaviorNode(
  value: unknown,
  path: string,
  diagnostics: CompilerDiagnostic[]
): Readonly<Record<string, unknown>> | undefined {
  if (isPlainObject(value)) {
    validateExactKeys(value, nodeKeys, path, diagnostics);
    return value;
  }
  add(diagnostics, path, "A collection behavior node must be an object.");
  return undefined;
}
function behaviorCandidate(
  value: Readonly<Record<string, unknown>>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): BehaviorCandidate | undefined {
  const collectionId = requiredString(value["collectionId"], `${path}/collectionId`, diagnostics);
  const targetId = requiredString(
    value["emptyFocusTargetId"],
    `${path}/emptyFocusTargetId`,
    diagnostics
  );
  if (collectionId === undefined || targetId === undefined) return undefined;
  return { collectionId, emptyFocusTargetId: targetId, path };
}
function requiredString(
  value: unknown,
  path: string,
  diagnostics: CompilerDiagnostic[]
): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  add(diagnostics, path, "Expected a non-empty node ID.");
  return undefined;
}
function validateUniqueCollection(candidate: BehaviorCandidate, context: ValidationContext): void {
  if (context.seen.has(candidate.collectionId)) {
    add(
      context.diagnostics,
      `${candidate.path}/collectionId`,
      `Collection behavior "${candidate.collectionId}" is duplicated.`
    );
  }
  context.seen.add(candidate.collectionId);
}
function validateCollectionAuthority(
  candidate: BehaviorCandidate,
  context: ValidationContext
): void {
  const kind = controlKind(context.controls, candidate.collectionId);
  if (aggregateKinds.has(kind)) return;
  add(
    context.diagnostics,
    `${candidate.path}/collectionId`,
    `Collection behavior "${candidate.collectionId}" requires an Array or Record control.`
  );
}
function controlKind(controls: unknown, id: string): unknown {
  return controlKindValue(controlNodes(controls).find((node) => controlId(node) === id));
}
function controlNodes(controls: unknown): readonly unknown[] {
  if (!isPlainObject(controls)) return [];
  const nodes = controls["nodes"];
  return Array.isArray(nodes) ? nodes : [];
}
function controlId(value: unknown): unknown {
  return isPlainObject(value) ? value["id"] : undefined;
}
function controlKindValue(value: unknown): unknown {
  return isPlainObject(value) ? value["kind"] : undefined;
}
function validateFocusTarget(candidate: BehaviorCandidate, context: ValidationContext): void {
  if (!validateDistinctTarget(candidate, context.diagnostics)) return;
  if (!validateExternalTarget(candidate, context)) return;
  validateAvailableTarget(candidate, context);
}
function validateDistinctTarget(
  candidate: BehaviorCandidate,
  diagnostics: CompilerDiagnostic[]
): boolean {
  if (candidate.collectionId !== candidate.emptyFocusTargetId) return true;
  add(diagnostics, `${candidate.path}/emptyFocusTargetId`, "Focus target must be distinct.");
  return false;
}
function validateExternalTarget(candidate: BehaviorCandidate, context: ValidationContext): boolean {
  if (
    !isControlDescendant(candidate.emptyFocusTargetId, candidate.collectionId, context.controls)
  ) {
    return true;
  }
  add(
    context.diagnostics,
    `${candidate.path}/emptyFocusTargetId`,
    "Focus target cannot belong to the collection control subtree."
  );
  return false;
}
function validateAvailableTarget(candidate: BehaviorCandidate, context: ValidationContext): void {
  const target = context.visuals.get(candidate.emptyFocusTargetId);
  if (target === undefined) {
    addUnknownTarget(candidate, context.diagnostics);
    return;
  }
  if (collectionHasFocusDestination(candidate.emptyFocusTargetId, context.visuals)) return;
  add(
    context.diagnostics,
    `${candidate.path}/emptyFocusTargetId`,
    `Focus target "${candidate.emptyFocusTargetId}" has no enabled focusable destination.`
  );
}
function addUnknownTarget(candidate: BehaviorCandidate, diagnostics: CompilerDiagnostic[]): void {
  add(
    diagnostics,
    `${candidate.path}/emptyFocusTargetId`,
    `Focus target "${candidate.emptyFocusTargetId}" is not a visual node.`
  );
}

function isControlDescendant(targetId: string, collectionId: string, controls: unknown): boolean {
  const parents = controlParents(controls);
  let current = parents.get(targetId);
  const visited = new Set<string>();
  while (current !== undefined) {
    if (current === collectionId) return true;
    current = nextUnvisitedParent(current, parents, visited);
  }
  return false;
}

function nextUnvisitedParent(
  current: string,
  parents: ReadonlyMap<string, string>,
  visited: Set<string>
): string | undefined {
  if (visited.has(current)) return undefined;
  visited.add(current);
  return parents.get(current);
}

function controlParents(controls: unknown): ReadonlyMap<string, string> {
  if (!isPlainObject(controls)) return new Map();
  const nodes = controls["nodes"];
  if (!Array.isArray(nodes)) return new Map();
  return new Map(nodes.flatMap(controlParentEntry));
}

function controlParentEntry(value: unknown): readonly [string, string][] {
  if (!isPlainObject(value)) return [];
  return stringPair(value["id"], value["parentId"]);
}

function stringPair(left: unknown, right: unknown): readonly [string, string][] {
  if (!isString(left)) return [];
  return isString(right) ? [[left, right]] : [];
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function validateExactKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
  path: string,
  diagnostics: CompilerDiagnostic[]
): void {
  [...allowed]
    .filter((key) => !Object.hasOwn(value, key))
    .forEach((key) => add(diagnostics, `${path}/${key}`, `Missing property "${key}".`));
  Object.keys(value)
    .filter((key) => !allowed.has(key))
    .forEach((key) => add(diagnostics, `${path}/${key}`, `Unknown property "${key}".`));
}

function add(diagnostics: CompilerDiagnostic[], path: string, message: string): void {
  diagnostics.push(errorDiagnostic(DiagnosticCode.InvalidCollectionBehavior, message, path));
}
