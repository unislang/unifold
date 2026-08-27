import {
  UiModuleRegistryStatus,
  UiModuleResolutionStatus,
  createUiModuleRegistry,
  resolveUiModule,
  type ResolveUiModuleOptions,
  type UiModuleRegistry,
  type UiResolvedModuleArtifact
} from "@unislang/unifold-modules";

import controlModule from "./modules/control.module.json" with { type: "json" };
import liveModule from "./modules/live.module.json" with { type: "json" };
import presentationModule from "./modules/presentation.module.json" with { type: "json" };

const controlEntry = entry("org.unifold.studio.control");
const liveEntry = entry("org.unifold.studio.live");

export interface StudioModuleArtifacts {
  readonly controlSurface: UiResolvedModuleArtifact;
  readonly liveApplication: UiResolvedModuleArtifact;
}

export interface StudioModuleIntegrities {
  readonly controlSurface: string;
  readonly liveApplication: string;
}

export async function resolveStudioModuleArtifacts(): Promise<StudioModuleArtifacts> {
  const registry = requireRegistry(
    await createUiModuleRegistry([
      source(presentationModule, "src/modules/presentation.module.json"),
      source(controlModule, "src/modules/control.module.json"),
      source(liveModule, "src/modules/live.module.json")
    ])
  );
  const [controlSurface, liveApplication] = await Promise.all([
    resolveArtifact(registry, controlEntry),
    resolveArtifact(registry, liveEntry)
  ]);
  return { controlSurface, liveApplication };
}

function source(module: unknown, sourceId: string) {
  return { module, sourceId };
}

function entry(moduleId: string): ResolveUiModuleOptions {
  return { exportName: "application", moduleId, version: "1.0.0" };
}

function requireRegistry(
  result: Awaited<ReturnType<typeof createUiModuleRegistry>>
): UiModuleRegistry {
  if (result.status === UiModuleRegistryStatus.Ready) return result.registry;
  throw new Error(`Studio UiModule registry failed: ${message(result.diagnostics)}`);
}

async function resolveArtifact(
  registry: UiModuleRegistry,
  request: ResolveUiModuleOptions
): Promise<UiResolvedModuleArtifact> {
  const result = await resolveUiModule(registry, request);
  if (result.status !== UiModuleResolutionStatus.Resolved) {
    throw new Error(`Studio UiModule resolution failed: ${message(result.diagnostics)}`);
  }
  return result.artifact;
}

function message(diagnostics: readonly { readonly message: string }[]): string {
  return diagnostics[0]?.message ?? "unknown diagnostic";
}
