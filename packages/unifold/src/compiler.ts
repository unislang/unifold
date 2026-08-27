import {
  CompositionExpansionStatus,
  LayoutExpansionStatus,
  expandComposedUiDocument,
  expandLayoutDocument,
  type CompositionDiagnostic,
  type CompositionExpansionResult
} from "@unislang/unifold-compositions";
import {
  UI_COMPOSITION_IDENTITY_VERSION,
  UiCompositionManifestVersion,
  type JsonObject,
  type UiCompositionManifest
} from "@unislang/unifold-contracts";
import {
  CompilationStatus,
  compileUiDocument,
  isJsonSafe,
  type CompilerDiagnostic,
  type CompileUiDocumentOptions,
  type CompileResult,
  type UnifoldIrDocument
} from "@unislang/unifold-ir";

import {
  UnifoldApplicationDiagnosticStage,
  UnifoldPreparationStatus,
  type PreparedUnifoldDocument,
  type UnifoldApplicationDiagnostic,
  type UnifoldPreparationOptions,
  type UnifoldPreparationResult
} from "./types.js";

const DEFAULT_COMPILATION_CACHE_ENTRIES = 32;

export class UnifoldDocumentCompiler {
  private readonly cache = new Map<string, UnifoldPreparationResult>();

  constructor(
    private readonly maximumEntries = DEFAULT_COMPILATION_CACHE_ENTRIES,
    private readonly options: UnifoldPreparationOptions = {}
  ) {
    assertCacheCapacity(maximumEntries);
  }

  get cachedDocumentCount(): number {
    return this.cache.size;
  }

  prepare(authored: unknown): UnifoldPreparationResult {
    const key = documentCacheKey(authored);
    if (key === undefined) return prepareUnifoldDocument(authored, this.options);
    const cached = this.cache.get(key);
    if (cached !== undefined) return this.cacheHit(key, cached);
    return this.cacheMiss(key, authored);
  }

  private cacheMiss(key: string, authored: unknown): UnifoldPreparationResult {
    const result = prepareUnifoldDocument(authored, this.options);
    if (result.status === UnifoldPreparationStatus.Valid) this.retain(key, result);
    return result;
  }

  clear(): void {
    this.cache.clear();
  }

  private cacheHit(key: string, cached: UnifoldPreparationResult): UnifoldPreparationResult {
    this.cache.delete(key);
    this.cache.set(key, cached);
    return structuredClone(cached);
  }

  private retain(key: string, result: UnifoldPreparationResult): void {
    this.cache.set(key, structuredClone(result));
    if (this.cache.size <= this.maximumEntries) return;
    const oldest = this.cache.keys().next().value as string | undefined;
    if (oldest !== undefined) this.cache.delete(oldest);
  }
}

export function prepareUnifoldDocument(
  authored: unknown,
  options: UnifoldPreparationOptions = {}
): UnifoldPreparationResult {
  const layout = expandAuthoredLayout(authored, options);
  if (layout.status === LayoutExpansionStatus.Invalid)
    return invalid(compositionDiagnostics(layout.diagnostics));
  return prepareExpandedLayout(
    authored,
    layout.document,
    layoutSourcePointers(layout),
    layoutCollections(layout)
  );
}

function expandAuthoredLayout(authored: unknown, options: UnifoldPreparationOptions) {
  if (options.layoutRegistry === undefined) return expandLayoutDocument(authored);
  return expandLayoutDocument(authored, { registry: options.layoutRegistry });
}

function layoutSourcePointers(layout: ReturnType<typeof expandLayoutDocument>) {
  return layout.sourcePointersByNodeId ?? {};
}

function layoutCollections(layout: ReturnType<typeof expandLayoutDocument>) {
  return layout.collectionsById ?? {};
}

function prepareExpandedLayout(
  authored: unknown,
  layoutDocument: unknown,
  sourcePointersByNodeId: Readonly<Record<string, string>>,
  collectionsById: PreparedUnifoldDocument["collectionsById"]
): UnifoldPreparationResult {
  const expansion = expandCompositionDocument(layoutDocument ?? authored);
  const expanded = expandedDocument(expansion);
  if (expanded === undefined) return invalid(compositionDiagnostics(expansion.diagnostics));
  return compileExpandedDocument(authored, expanded, { sourcePointersByNodeId }, collectionsById);
}

function expandCompositionDocument(value: unknown): CompositionExpansionResult {
  if (!isCompositionFreeDocument(value)) return expandComposedUiDocument(value);
  return {
    diagnostics: [],
    document: compositionFreeDocument(value),
    exportsByInstanceId: {},
    manifest: emptyCompositionManifest(),
    status: CompositionExpansionStatus.Valid
  };
}

function isCompositionFreeDocument(value: unknown): value is JsonObject {
  if (!isRecord(value)) return false;
  if (!hasNoCompositionDefinitions(value["compositions"])) return false;
  return !containsCompositionInstance(value["view"]);
}

function hasNoCompositionDefinitions(value: unknown): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.length === 0;
}

function containsCompositionInstance(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return recordContainsCompositionInstance(value);
}

function recordContainsCompositionInstance(value: Record<string, unknown>): boolean {
  const pending: Record<string, unknown>[] = [value];
  const seen = new Set<Record<string, unknown>>();
  for (const node of pending) {
    if (isCompositionOrRepeat(seen, node)) return true;
    appendChildNodes(pending, node["$children"]);
  }
  return false;
}

function isCompositionOrRepeat(
  seen: Set<Record<string, unknown>>,
  node: Record<string, unknown>
): boolean {
  if (visitRepeatedNode(seen, node)) return true;
  return typeof node["$compose"] === "string";
}

function visitRepeatedNode(seen: Set<Record<string, unknown>>, node: Record<string, unknown>) {
  if (seen.has(node)) return true;
  seen.add(node);
  return false;
}

function appendChildNodes(pending: Record<string, unknown>[], value: unknown): void {
  if (Array.isArray(value)) pending.push(...value.filter(isRecord));
}

function compositionFreeDocument(value: JsonObject) {
  const document = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "compositions")
  );
  return {
    ...document,
    compositionManifest: emptyCompositionManifest(),
    view: value["view"]
  } as never;
}

function emptyCompositionManifest(): UiCompositionManifest {
  return {
    contractVersion: UiCompositionManifestVersion.Version1,
    identityAliases: {},
    identityVersion: UI_COMPOSITION_IDENTITY_VERSION,
    instances: [],
    nodeProvenanceById: {}
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compileExpandedDocument(
  authored: unknown,
  expanded: unknown,
  options: CompileUiDocumentOptions,
  collectionsById: PreparedUnifoldDocument["collectionsById"]
): UnifoldPreparationResult {
  const compilation = compileUiDocument(expanded, options);
  const document = compiledDocument(compilation);
  if (document === undefined) return invalid(compilerDiagnostics(compilation.diagnostics));
  return valid({ authored: structuredClone(authored), collectionsById, document });
}

function documentCacheKey(authored: unknown): string | undefined {
  if (!isJsonSafe(authored)) return undefined;
  return JSON.stringify(authored);
}

function assertCacheCapacity(value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError("Compilation cache entries must be a positive integer.");
  }
}

function expandedDocument(result: CompositionExpansionResult) {
  if (result.status !== CompositionExpansionStatus.Valid) return undefined;
  if (result.document === undefined) return undefined;
  return result.document;
}

function compiledDocument(result: CompileResult): UnifoldIrDocument | undefined {
  if (result.status !== CompilationStatus.Valid) return undefined;
  return result.document;
}

function compositionDiagnostics(
  diagnostics: readonly CompositionDiagnostic[]
): readonly UnifoldApplicationDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    code: String(diagnostic.code),
    stage: UnifoldApplicationDiagnosticStage.Composition
  }));
}

function compilerDiagnostics(
  diagnostics: readonly CompilerDiagnostic[]
): readonly UnifoldApplicationDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    code: String(diagnostic.code),
    message: diagnostic.message,
    path: diagnostic.path,
    stage: UnifoldApplicationDiagnosticStage.Compilation
  }));
}

function invalid(diagnostics: readonly UnifoldApplicationDiagnostic[]): UnifoldPreparationResult {
  return { diagnostics, status: UnifoldPreparationStatus.Invalid };
}

function valid(prepared: PreparedUnifoldDocument): UnifoldPreparationResult {
  return { diagnostics: [], prepared, status: UnifoldPreparationStatus.Valid };
}
