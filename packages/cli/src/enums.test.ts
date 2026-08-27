import { expect, it } from "vitest";

import {
  UnifoldCliCommand,
  UnifoldCliDiagnosticCode,
  UnifoldCliGenerator,
  UnifoldCliModuleAction,
  UnifoldCliModuleBuildSchemaUri,
  UnifoldCliModuleBuildSchemaVersion,
  UnifoldCliModuleProjectSchemaVersion,
  UnifoldCliStatus
} from "./enums.js";

it("defines stable enum-backed CLI vocabulary", () => {
  expect(UnifoldCliCommand.Validate).toBe("validate");
  expect(UnifoldCliGenerator.Starter).toBe("starter");
  expect(UnifoldCliModuleAction.Check).toBe("check");
  expect(UnifoldCliDiagnosticCode.ModuleBuildInvalid).toBe("module-build-invalid");
  expect(UnifoldCliDiagnosticCode.ModuleLockStale).toBe("module-lock-stale");
  expect(UnifoldCliDiagnosticCode.StarterTargetUnsafe).toBe("starter-target-unsafe");
  expect(UnifoldCliModuleBuildSchemaUri.Version1).toContain("/ui-module-build/1.0/");
  expect(UnifoldCliModuleBuildSchemaUri.Version2).toContain("/ui-module-build/2.0/");
  expect(UnifoldCliModuleBuildSchemaVersion.Version1).toBe("1.0.0");
  expect(UnifoldCliModuleBuildSchemaVersion.Version2).toBe("2.0.0");
  expect(UnifoldCliModuleProjectSchemaVersion.Version1).toBe("1.0.0");
  expect(UnifoldCliStatus.Succeeded).toBe("succeeded");
});
