import type { JsonObject } from "@unislang/unifold-contracts";
import {
  UiModuleRegistryStatus,
  UiModuleResolutionStatus,
  createUiDocumentModule,
  createUiModuleRegistry,
  resolveUiModule,
  type UiModuleRegistry,
  type UiResolvedModuleArtifact
} from "@unislang/unifold-modules";

import controlSurface from "./control-surface.json" with { type: "json" };
import liveApplication from "./live-application.json" with { type: "json" };

const moduleVersion = "1.0.0";
const exportName = "application";
const controlModuleId = "org.unifold.studio.control-surface";
const liveModuleId = "org.unifold.studio.live-application";

export interface StudioModuleArtifacts {
  readonly controlSurface: UiResolvedModuleArtifact;
  readonly liveApplication: UiResolvedModuleArtifact;
}

export interface StudioModuleIntegrities {
  readonly controlSurface: string;
  readonly liveApplication: string;
}

export async function resolveStudioModuleArtifacts(): Promise<StudioModuleArtifacts> {
  const registry = await createUiModuleRegistry([
    moduleSource(controlModuleId, controlSurface as JsonObject, "src/control-surface.json"),
    moduleSource(liveModuleId, liveApplication as JsonObject, "src/live-application.json")
  ]);
  if (registry.status !== UiModuleRegistryStatus.Ready) {
    throw new Error(`Studio UiModule registry failed: ${message(registry.diagnostics)}`);
  }
  const [control, live] = await Promise.all([
    resolveArtifact(registry.registry, controlModuleId),
    resolveArtifact(registry.registry, liveModuleId)
  ]);
  return { controlSurface: control, liveApplication: live };
}

function moduleSource(moduleId: string, document: JsonObject, sourceId: string) {
  return {
    module: createUiDocumentModule({ document, exportName, moduleId, version: moduleVersion }),
    sourceId
  };
}

async function resolveArtifact(
  registry: UiModuleRegistry,
  moduleId: string
): Promise<UiResolvedModuleArtifact> {
  const result = await resolveUiModule(registry, { exportName, moduleId, version: moduleVersion });
  if (result.status === UiModuleResolutionStatus.Resolved) return result.artifact;
  throw new Error(`Studio UiModule resolution failed: ${message(result.diagnostics)}`);
}

function message(diagnostics: readonly { readonly message: string }[]): string {
  return diagnostics[0]?.message ?? "unknown diagnostic";
}
