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
import profileModule from "./modules/profile.module.json" with { type: "json" };
import scratchModule from "./modules/scratch.module.json" with { type: "json" };
import sharedModule from "./modules/shared.module.json" with { type: "json" };

export async function resolveReferenceModuleArtifact(): Promise<UiResolvedModuleArtifact> {
  return resolveApplicationArtifact([
    { module: sharedModule, sourceId: "src/modules/shared.module.json" },
    { module: scratchModule, sourceId: "src/modules/scratch.module.json" }
  ]);
}

export async function resolveProductionReferenceArtifact(): Promise<UiResolvedModuleArtifact> {
  return resolveApplicationArtifact([
    { module: profileModule, sourceId: "src/modules/profile.module.json" },
    { module: applicationModule, sourceId: "src/modules/application.module.json" }
  ]);
}

async function resolveApplicationArtifact(
  sources: Parameters<typeof createUiModuleRegistry>[0]
): Promise<UiResolvedModuleArtifact> {
  const registry = await createUiModuleRegistry(sources);
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
