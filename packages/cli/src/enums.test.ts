import { expect, it } from "vitest";

import {
  UnifoldCliCommand,
  UnifoldCliDiagnosticCode,
  UnifoldCliGenerator,
  UnifoldCliModuleBuildSchemaVersion,
  UnifoldCliModuleProjectSchemaVersion,
  UnifoldCliStatus
} from "./enums.js";

it("defines stable enum-backed CLI vocabulary", () => {
  expect(UnifoldCliCommand.Validate).toBe("validate");
  expect(UnifoldCliGenerator.Starter).toBe("starter");
  expect(UnifoldCliDiagnosticCode.StarterTargetUnsafe).toBe("starter-target-unsafe");
  expect(UnifoldCliModuleBuildSchemaVersion.Version1).toBe("1.0.0");
  expect(UnifoldCliModuleProjectSchemaVersion.Version1).toBe("1.0.0");
  expect(UnifoldCliStatus.Succeeded).toBe("succeeded");
});
