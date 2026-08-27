import { CompositionDiagnosticCode } from "./enums.js";
import { addLayoutDiagnostic, isSafeLayoutName } from "./layout-values.js";
import type { CompositionDiagnostic, LayoutCollectionDefinition } from "./types.js";

export interface LayoutRepeatDefinition {
  readonly alias: string;
  readonly collection?: string;
  readonly key: string;
  readonly reference: string;
}

const REPEAT_PATTERN =
  /^([A-Za-z][A-Za-z0-9_-]*) in \{\{([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*)\}\}$/u;

export function registerLayoutCollection(
  name: string | undefined,
  keyProperty: string,
  sourcePointer: string,
  path: string,
  definitions: Record<string, LayoutCollectionDefinition>,
  diagnostics: CompositionDiagnostic[]
): boolean {
  if (name === undefined) return true;
  return registerNamedLayoutCollection(
    name,
    keyProperty,
    sourcePointer,
    path,
    definitions,
    diagnostics
  );
}

function registerNamedLayoutCollection(
  name: string,
  keyProperty: string,
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
  definitions[name] = { keyProperty, sourcePointer };
  return true;
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
  return repeatWithCollection(value["collection"], match, key, path, diagnostics);
}

function repeatWithCollection(
  collection: unknown,
  match: RegExpExecArray,
  key: string,
  path: string,
  diagnostics: CompositionDiagnostic[]
): LayoutRepeatDefinition | undefined {
  const base = { alias: match[1] as string, key, reference: match[2] as string };
  if (collection === undefined) return base;
  if (!isSafeLayoutName(collection)) {
    rejectLayoutCollection(path, diagnostics);
    return undefined;
  }
  return { ...base, collection };
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
