import {
  UiModuleLockSchemaUri,
  UiModuleLockSchemaVersion,
  type ResolveUiModuleOptions,
  type UiModuleLock,
  type UiResolvedModuleArtifact,
  type UiResolvedModuleGraphEntry
} from "./types.js";

export function createUiModuleLock(
  artifact: UiResolvedModuleArtifact,
  entry: ResolveUiModuleOptions,
  irIntegrity: string
): UiModuleLock {
  return {
    $schema: UiModuleLockSchemaUri.Version1,
    artifactIntegrity: artifact.integrity,
    entry: { ...entry },
    irIntegrity,
    modules: [...artifact.graph].sort(compareGraphEntries),
    schemaVersion: UiModuleLockSchemaVersion.Version1
  };
}

function compareGraphEntries(
  left: UiResolvedModuleGraphEntry,
  right: UiResolvedModuleGraphEntry
): number {
  return graphKey(left).localeCompare(graphKey(right));
}

function graphKey(entry: UiResolvedModuleGraphEntry): string {
  return JSON.stringify([
    entry.moduleId,
    entry.version,
    entry.namespace,
    entry.sourceId,
    entry.integrity
  ]);
}
