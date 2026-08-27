import { expect, it } from "vitest";

import { validateUiModuleLock } from "./lock-schema.js";
import {
  UiModuleLockSchemaUri,
  UiModuleLockSchemaVersion,
  UiModuleDiagnosticCode
} from "./types.js";

it("validates the exact generated lock contract", () => {
  const lock = {
    $schema: UiModuleLockSchemaUri.Version1,
    artifactIntegrity: integrity("a"),
    entry: { exportName: "application", moduleId: "org.example.root", version: "1.0.0" },
    irIntegrity: integrity("c"),
    modules: [
      {
        integrity: integrity("b"),
        moduleId: "org.example.root",
        namespace: "",
        sourceId: "root.module.json",
        version: "1.0.0"
      }
    ],
    schemaVersion: UiModuleLockSchemaVersion.Version1
  };
  expect(validateUiModuleLock(lock)).toMatchObject({ diagnostics: [], lock });
});

it("rejects lock drift and unpinned module entries", () => {
  expect(validateUiModuleLock({ schemaVersion: "2.0.0" }).diagnostics[0]?.code).toBe(
    UiModuleDiagnosticCode.InvalidLock
  );
});

function integrity(character: string): string {
  return `sha256-${character.repeat(43)}`;
}
