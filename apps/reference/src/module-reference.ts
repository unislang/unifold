import {
  UiModuleRegistryStatus,
  UiModuleResolutionStatus,
  createUiModuleRegistry,
  resolveUiModule,
  type UiModuleRegistry,
  type UiModuleRegistryResult,
  type UiModuleResolutionResult,
  type UiResolvedModuleArtifact
} from "@unislang/unifold-modules";

import applicationModule from "./modules/application.module.json" with { type: "json" };
import sharedModule from "./modules/shared.module.json" with { type: "json" };

export async function resolveReferenceModuleArtifact(): Promise<UiResolvedModuleArtifact> {
  const registry = await createUiModuleRegistry([
    { module: sharedModule, sourceId: "src/modules/shared.module.json" },
    { module: applicationModule, sourceId: "src/modules/application.module.json" }
  ]);
  const resolution = await resolveUiModule(requireRegistry(registry), {
    exportName: "application",
    moduleId: "org.unifold.reference.application",
    version: "1.0.0"
  });
  return requireArtifact(resolution);
}

function requireRegistry(result: UiModuleRegistryResult): UiModuleRegistry {
  if (result.status === UiModuleRegistryStatus.Ready) return result.registry;
  throw new Error(`Reference UiModule registry failed: ${diagnosticMessage(result.diagnostics)}`);
}

function requireArtifact(result: UiModuleResolutionResult): UiResolvedModuleArtifact {
  if (result.status === UiModuleResolutionStatus.Resolved) return result.artifact;
  throw new Error(`Reference UiModule resolution failed: ${diagnosticMessage(result.diagnostics)}`);
}

function diagnosticMessage(diagnostics: readonly { readonly message: string }[]): string {
  const first = diagnostics[0];
  return first === undefined ? "unknown diagnostic" : first.message;
}
