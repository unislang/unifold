import { createTrustedLayoutDefinitionRegistry } from "@unislang/unifold-compositions";

import { uiModuleIntegrity } from "./integrity.js";
import type { UiModuleApplicationInput, UiResolvedModuleArtifact } from "./types.js";

export async function createUiModuleApplicationInput(
  artifact: UiResolvedModuleArtifact,
  expectedIntegrity: string
): Promise<UiModuleApplicationInput> {
  requireExpectedIntegrity(artifact.integrity, expectedIntegrity);
  const content: Partial<UiResolvedModuleArtifact> = { ...artifact };
  Reflect.deleteProperty(content, "integrity");
  const actual = await uiModuleIntegrity(content);
  requireExpectedIntegrity(actual, expectedIntegrity);
  return {
    document: structuredClone(artifact.authoredDocument),
    layoutRegistry: createTrustedLayoutDefinitionRegistry(artifact.layoutDefinitions)
  };
}

function requireExpectedIntegrity(actual: string, expected: string): void {
  if (actual === expected) return;
  throw new Error("Resolved UiModule artifact integrity does not match the trusted lock.");
}
