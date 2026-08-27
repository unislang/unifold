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
import layoutsModule from "./modules/layouts.module.json" with { type: "json" };

const MODULE_ID = "org.unifold.examples.hierarchical-application";
const MODULE_VERSION = "1.0.0";

export async function resolveHierarchicalModuleArtifact(): Promise<UiResolvedModuleArtifact> {
  const registry = await createUiModuleRegistry([
    { module: layoutsModule, sourceId: "src/modules/layouts.module.json" },
    { module: applicationModule, sourceId: "src/modules/application.module.json" }
  ]);
  const resolution = await resolveUiModule(requireRegistry(registry), {
    exportName: "application",
    moduleId: MODULE_ID,
    version: MODULE_VERSION
  });
  return requireArtifact(resolution);
}

function requireRegistry(result: UiModuleRegistryResult): UiModuleRegistry {
  if (result.status === UiModuleRegistryStatus.Ready) return result.registry;
  throw new Error(`Hierarchical UiModule rejected: ${message(result.diagnostics)}`);
}

function requireArtifact(result: UiModuleResolutionResult): UiResolvedModuleArtifact {
  if (result.status === UiModuleResolutionStatus.Resolved) return result.artifact;
  throw new Error(`Hierarchical UiModule resolution failed: ${message(result.diagnostics)}`);
}

function message(diagnostics: readonly { readonly message: string }[]): string {
  return diagnostics[0]?.message ?? "unknown diagnostic";
}
