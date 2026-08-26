import type { CompilerDiagnostic } from "./types.js";

interface NodePointerMapping {
  readonly authored: string;
  readonly canonical: string;
}

export function remapCompilerDiagnosticPaths(
  input: unknown,
  diagnostics: readonly CompilerDiagnostic[],
  sourcePointersByNodeId: Readonly<Record<string, string>>
): readonly CompilerDiagnostic[] {
  const mappings = nodePointerMappings(input, sourcePointersByNodeId);
  if (mappings.length === 0) return diagnostics;
  return diagnostics.map((diagnostic) => remapDiagnostic(diagnostic, mappings));
}

function nodePointerMappings(
  input: unknown,
  sourcePointersByNodeId: Readonly<Record<string, string>>
): readonly NodePointerMapping[] {
  const document = plainObject(input);
  if (document === undefined) return [];
  const mappings: NodePointerMapping[] = [];
  collectNodeMappings(document["view"], "/view", sourcePointersByNodeId, mappings);
  return mappings.sort(({ canonical: left }, { canonical: right }) => right.length - left.length);
}

function collectNodeMappings(
  value: unknown,
  canonical: string,
  sourcePointers: Readonly<Record<string, string>>,
  mappings: NodePointerMapping[]
): void {
  const node = plainObject(value);
  if (node === undefined) return;
  addNodeMapping(node, canonical, sourcePointers, mappings);
  collectChildren(node["$children"], canonical, sourcePointers, mappings);
}

function addNodeMapping(
  node: Readonly<Record<string, unknown>>,
  canonical: string,
  sourcePointers: Readonly<Record<string, string>>,
  mappings: NodePointerMapping[]
): void {
  const id = node["id"];
  if (typeof id !== "string") return;
  const authored = sourcePointers[id];
  if (authored !== undefined) mappings.push({ authored, canonical });
}

function collectChildren(
  value: unknown,
  canonical: string,
  sourcePointers: Readonly<Record<string, string>>,
  mappings: NodePointerMapping[]
): void {
  if (!Array.isArray(value)) return;
  value.forEach((child, index) =>
    collectNodeMappings(child, `${canonical}/$children/${String(index)}`, sourcePointers, mappings)
  );
}

function remapDiagnostic(
  diagnostic: CompilerDiagnostic,
  mappings: readonly NodePointerMapping[]
): CompilerDiagnostic {
  const mapping = mappings.find(({ canonical }) => isWithin(diagnostic.path, canonical));
  if (mapping === undefined) return diagnostic;
  const suffix = diagnostic.path.slice(mapping.canonical.length);
  return { ...diagnostic, path: `${mapping.authored}${authoredSuffix(suffix)}` };
}

function isWithin(path: string, parent: string): boolean {
  return path === parent || path.startsWith(`${parent}/`);
}

function authoredSuffix(suffix: string): string {
  if (suffix === "") return suffix;
  return authoredNonEmptySuffix(suffix);
}

function authoredNonEmptySuffix(suffix: string): string {
  if (suffix === "/$comp") return "/type";
  if (suffix.startsWith("/$children")) return suffix.replace("/$children", "/children");
  return authoredPropertySuffix(suffix);
}

function authoredPropertySuffix(suffix: string): string {
  if (suffix.startsWith("/events")) return suffix;
  if (suffix.startsWith("/id")) return suffix;
  return `/props${suffix}`;
}

function plainObject(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (Object.prototype.toString.call(value) !== "[object Object]") return undefined;
  return value as Readonly<Record<string, unknown>>;
}
