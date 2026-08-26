import {
  UiCompositionExportKind,
  UiCompositionSelectionKind,
  type JsonPrimitive,
  type UiCompositionInstanceManifest,
  type UiResolvedCompositionExport
} from "@unislang/unifold-contracts";

import { semanticError } from "./diagnostics.js";
import { SemanticDiagnosticCode } from "./enums.js";
import type {
  SemanticCompilationSource,
  SemanticCompositionExportControlBinding,
  SemanticDiagnostic
} from "./types.js";

export function validateCompositionBinding(
  binding: SemanticCompositionExportControlBinding,
  source: SemanticCompilationSource,
  path: string,
  diagnostics: SemanticDiagnostic[],
  validateNode: (nodeId: string) => void
): void {
  const descriptor = resolveSemanticExport(binding, source, path, diagnostics);
  if (descriptor !== undefined) validateNode(descriptor.nodeId);
}

export function resolveCompositionControlValue(
  binding: SemanticCompositionExportControlBinding,
  source: SemanticCompilationSource
): JsonPrimitive {
  const instance = source.compositionsByInstanceId[
    binding.instanceId
  ] as UiCompositionInstanceManifest;
  const descriptor = instance.exports[binding.exportName] as UiResolvedCompositionExport;
  return source.snapshots[descriptor.nodeId]?.control?.value as JsonPrimitive;
}

function resolveSemanticExport(
  binding: SemanticCompositionExportControlBinding,
  source: SemanticCompilationSource,
  path: string,
  diagnostics: SemanticDiagnostic[]
): UiResolvedCompositionExport | undefined {
  const instance = resolveSemanticInstance(binding, source, path, diagnostics);
  if (instance === undefined) return undefined;
  return resolveControlExport(binding, instance, path, diagnostics);
}

function resolveSemanticInstance(
  binding: SemanticCompositionExportControlBinding,
  source: SemanticCompilationSource,
  path: string,
  diagnostics: SemanticDiagnostic[]
): UiCompositionInstanceManifest | undefined {
  const instance = source.compositionsByInstanceId[binding.instanceId];
  if (instance !== undefined) return instance;
  diagnostics.push(compositionExportError(path, binding, "Unknown composition instance"));
  return undefined;
}

function resolveControlExport(
  binding: SemanticCompositionExportControlBinding,
  instance: UiCompositionInstanceManifest,
  path: string,
  diagnostics: SemanticDiagnostic[]
): UiResolvedCompositionExport | undefined {
  const descriptor = instance.exports[binding.exportName];
  if (isControlSelection(descriptor)) return descriptor;
  diagnostics.push(compositionExportError(path, binding, "Invalid control-value export"));
  return undefined;
}

function isControlSelection(
  descriptor: UiResolvedCompositionExport | undefined
): descriptor is UiResolvedCompositionExport {
  if (descriptor?.kind !== UiCompositionExportKind.Selection) return false;
  return descriptor.selection === UiCompositionSelectionKind.ControlValue;
}

function compositionExportError(
  path: string,
  binding: SemanticCompositionExportControlBinding,
  message: string
): SemanticDiagnostic {
  return semanticError(
    SemanticDiagnosticCode.InvalidCompositionExport,
    path,
    `${message}: ${binding.instanceId}.${binding.exportName}.`
  );
}
