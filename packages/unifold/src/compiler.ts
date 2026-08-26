import {
  CompositionExpansionStatus,
  expandComposedUiDocument,
  type CompositionDiagnostic,
  type CompositionExpansionResult
} from "@unislang/unifold-compositions";
import {
  CompilationStatus,
  compileUiDocument,
  isJsonSafe,
  type CompilerDiagnostic,
  type CompileResult,
  type UnifoldIrDocument
} from "@unislang/unifold-ir";

import {
  UnifoldApplicationDiagnosticStage,
  UnifoldPreparationStatus,
  type PreparedUnifoldDocument,
  type UnifoldApplicationDiagnostic,
  type UnifoldPreparationResult
} from "./types.js";

const DEFAULT_COMPILATION_CACHE_ENTRIES = 32;

export class UnifoldDocumentCompiler {
  private readonly cache = new Map<string, UnifoldPreparationResult>();

  constructor(private readonly maximumEntries = DEFAULT_COMPILATION_CACHE_ENTRIES) {
    assertCacheCapacity(maximumEntries);
  }

  get cachedDocumentCount(): number {
    return this.cache.size;
  }

  prepare(authored: unknown): UnifoldPreparationResult {
    const key = documentCacheKey(authored);
    if (key === undefined) return prepareUnifoldDocument(authored);
    const cached = this.cache.get(key);
    if (cached !== undefined) return this.cacheHit(key, cached);
    return this.cacheMiss(key, authored);
  }

  private cacheMiss(key: string, authored: unknown): UnifoldPreparationResult {
    const result = prepareUnifoldDocument(authored);
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

export function prepareUnifoldDocument(authored: unknown): UnifoldPreparationResult {
  const expansion = expandComposedUiDocument(authored);
  const expanded = expandedDocument(expansion);
  if (expanded === undefined) {
    return invalid(compositionDiagnostics(expansion.diagnostics));
  }
  const compilation = compileUiDocument(expanded);
  const document = compiledDocument(compilation);
  if (document === undefined) {
    return invalid(compilerDiagnostics(compilation.diagnostics));
  }
  return valid({ authored: structuredClone(authored), document });
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
