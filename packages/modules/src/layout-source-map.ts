import type { JsonObject } from "@unislang/unifold-contracts";

import type { UiModuleSourceLocation } from "./types.js";

const registryPointerPattern = /^\/\$layoutRegistry\/definitions\/(\d+)(\/.*)?$/u;

interface LayoutSourceMapOptions {
  readonly document: JsonObject;
  readonly documentSource: UiModuleSourceLocation;
  readonly registrySources: ReadonlyMap<number, UiModuleSourceLocation>;
  readonly sourcePointersByNodeId?: Readonly<Record<string, string>>;
}

interface NodePointer {
  readonly id: string;
  readonly pointer: string;
}

export function layoutDocumentSourceMap(
  options: LayoutSourceMapOptions
): Record<string, UiModuleSourceLocation> {
  if (options.sourcePointersByNodeId === undefined) return canonicalViewSource(options);
  const nodes = collectNodePointers(options.document["view"], "/view");
  return Object.fromEntries(nodes.flatMap((node) => sourceMapEntry(node, options)));
}

function canonicalViewSource(
  options: LayoutSourceMapOptions
): Record<string, UiModuleSourceLocation> {
  return { "/view": appendPointer(options.documentSource, "/view") };
}

function sourceMapEntry(
  node: NodePointer,
  options: LayoutSourceMapOptions
): readonly [string, UiModuleSourceLocation][] {
  const sourcePointer = options.sourcePointersByNodeId?.[node.id];
  if (sourcePointer === undefined) return [];
  return [[node.pointer, translatedSource(sourcePointer, options)]];
}

function translatedSource(
  pointer: string,
  options: LayoutSourceMapOptions
): UiModuleSourceLocation {
  const registry = registryPointer(pointer, options.registrySources);
  if (registry !== undefined) return registry;
  if (pointer.startsWith("/$layoutRegistry/")) return hostLayoutSelector(options.documentSource);
  return appendPointer(options.documentSource, pointer);
}

function registryPointer(
  pointer: string,
  sources: ReadonlyMap<number, UiModuleSourceLocation>
): UiModuleSourceLocation | undefined {
  const match = registryPointerPattern.exec(pointer);
  if (match === null) return undefined;
  const source = sources.get(Number(match[1]));
  if (source === undefined) return undefined;
  return appendPointer(source, registrySuffix(match));
}

function registrySuffix(match: RegExpExecArray): string {
  return match[2] === undefined ? "" : match[2];
}

function hostLayoutSelector(source: UiModuleSourceLocation): UiModuleSourceLocation {
  return appendPointer(source, "/layoutType");
}

function appendPointer(source: UiModuleSourceLocation, suffix: string): UiModuleSourceLocation {
  return { ...source, pointer: `${source.pointer}${suffix}` };
}

function collectNodePointers(value: unknown, pointer: string): NodePointer[] {
  if (!isObject(value)) return [];
  const current = typeof value["id"] === "string" ? [{ id: value["id"], pointer }] : [];
  return [...current, ...collectChildPointers(value["$children"], pointer)];
}

function collectChildPointers(value: unknown, pointer: string): NodePointer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((child, index) =>
    collectNodePointers(child, `${pointer}/$children/${String(index)}`)
  );
}

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
