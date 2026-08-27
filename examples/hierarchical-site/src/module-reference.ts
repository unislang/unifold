import {
  UiModuleRegistryStatus,
  UiModuleResolutionStatus,
  createUiDocumentModule,
  createUiModuleRegistry,
  resolveUiModule,
  type UiResolvedModuleArtifact
} from "@unislang/unifold-modules";
import { createTrustedLayoutDefinitionRegistry } from "@unislang/unifold-compositions";
import type { JsonObject } from "@unislang/unifold-contracts";

import layoutDefinitions from "./layouts.json" with { type: "json" };
import sourceDocument from "./ui.json" with { type: "json" };

const moduleId = "org.unifold.examples.hierarchical-contact";
const moduleVersion = "1.0.0";
const exportName = "application";

export const hierarchicalLayoutRegistry = createTrustedLayoutDefinitionRegistry(layoutDefinitions);

export async function resolveHierarchicalModuleArtifact(): Promise<UiResolvedModuleArtifact> {
  const module = createUiDocumentModule({
    document: sourceDocument as JsonObject,
    exportName,
    moduleId,
    version: moduleVersion
  });
  const registry = await createUiModuleRegistry([{ module, sourceId: "src/ui.json" }]);
  if (registry.status !== UiModuleRegistryStatus.Ready) {
    throw new Error(`Hierarchical UiModule rejected: ${message(registry.diagnostics)}`);
  }
  const resolution = await resolveUiModule(registry.registry, {
    exportName,
    layoutRegistry: hierarchicalLayoutRegistry,
    moduleId,
    version: moduleVersion
  });
  if (resolution.status === UiModuleResolutionStatus.Resolved) return resolution.artifact;
  throw new Error(`Hierarchical UiModule resolution failed: ${message(resolution.diagnostics)}`);
}

function message(diagnostics: readonly { readonly message: string }[]): string {
  return diagnostics[0]?.message ?? "unknown diagnostic";
}
