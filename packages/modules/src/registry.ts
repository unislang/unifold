import { uiModuleIntegrity } from "./integrity.js";
import { moduleSafetyDiagnostic } from "./module-safety.js";
import { validateUiModule } from "./schema.js";
import {
  UiModuleDiagnosticCode,
  UiModuleRegistryStatus,
  type RegisteredUiModule,
  type UiModule,
  type UiModuleDiagnostic,
  type UiModuleRegistryResult,
  type UiModuleSource
} from "./types.js";

export async function createUiModuleRegistry(
  sources: readonly UiModuleSource[]
): Promise<UiModuleRegistryResult> {
  const modules = new Map<string, RegisteredUiModule>();
  const diagnostics: UiModuleDiagnostic[] = [];
  for (const source of sources) await registerSource(source, modules, diagnostics);
  if (diagnostics.length > 0) return { diagnostics, status: UiModuleRegistryStatus.Rejected };
  return { diagnostics: [], registry: { modules }, status: UiModuleRegistryStatus.Ready };
}

export function uiModuleKey(moduleId: string, version: string): string {
  return JSON.stringify([moduleId, version]);
}

async function registerSource(
  source: UiModuleSource,
  modules: Map<string, RegisteredUiModule>,
  diagnostics: UiModuleDiagnostic[]
): Promise<void> {
  const safety = moduleSafetyDiagnostic(source.module, source.sourceId);
  if (safety !== undefined) {
    diagnostics.push(safety);
    return;
  }
  await registerSafeSource(source, modules, diagnostics);
}

async function registerSafeSource(
  source: UiModuleSource,
  modules: Map<string, RegisteredUiModule>,
  diagnostics: UiModuleDiagnostic[]
): Promise<void> {
  const validation = validateUiModule(source.module, source.sourceId);
  if (validation.module === undefined) {
    diagnostics.push(...validation.diagnostics);
    return;
  }
  await registerLocallyValid(source.sourceId, validation.module, modules, diagnostics);
}

async function registerLocallyValid(
  sourceId: string,
  module: UiModule,
  modules: Map<string, RegisteredUiModule>,
  diagnostics: UiModuleDiagnostic[]
): Promise<void> {
  const local = localDiagnostics(module, sourceId);
  if (local.length > 0) {
    diagnostics.push(...local);
    return;
  }
  await registerValidated(sourceId, module, modules, diagnostics);
}

async function registerValidated(
  sourceId: string,
  module: UiModule,
  modules: Map<string, RegisteredUiModule>,
  diagnostics: UiModuleDiagnostic[]
): Promise<void> {
  const key = uiModuleKey(module.id, module.version);
  if (modules.has(key)) {
    diagnostics.push(diagnostic(UiModuleDiagnosticCode.DuplicateModule, "/id", sourceId));
    return;
  }
  modules.set(key, { integrity: await uiModuleIntegrity(module), module, sourceId });
}

function localDiagnostics(module: UiModule, sourceId: string): UiModuleDiagnostic[] {
  return [
    duplicateDiagnostic(
      module.imports.map(({ namespace }) => namespace),
      "/imports",
      sourceId,
      UiModuleDiagnosticCode.DuplicateNamespace
    ),
    duplicateResourceDiagnostic(module, sourceId)
  ].flat();
}

function duplicateResourceDiagnostic(module: UiModule, sourceId: string): UiModuleDiagnostic[] {
  return [
    duplicateDiagnostic(
      module.exports.documents.map(({ name }) => name),
      "/exports/documents",
      sourceId,
      UiModuleDiagnosticCode.DuplicateResource
    ),
    duplicateDiagnostic(
      module.exports.compositions.map(({ name, version }) => `${name}@${version}`),
      "/exports/compositions",
      sourceId,
      UiModuleDiagnosticCode.DuplicateResource
    ),
    duplicateDiagnostic(
      module.exports.resources.map(({ id, kind }) => `${kind}:${id}`),
      "/exports/resources",
      sourceId,
      UiModuleDiagnosticCode.DuplicateResource
    )
  ].flat();
}

function duplicateDiagnostic(
  values: readonly string[],
  path: string,
  sourceId: string,
  code: UiModuleDiagnosticCode
): UiModuleDiagnostic[] {
  return new Set(values).size === values.length ? [] : [diagnostic(code, path, sourceId)];
}

function diagnostic(
  code: UiModuleDiagnosticCode,
  path: string,
  sourceId: string
): UiModuleDiagnostic {
  return { code, message: `UiModule registration failed: ${code}.`, path, sourceId };
}
