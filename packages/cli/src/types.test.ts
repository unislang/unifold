import { expect, expectTypeOf, it } from "vitest";

import { UnifoldCliCommand, UnifoldCliModuleAction, UnifoldCliStatus } from "./enums.js";
import type { UnifoldCliInvocation, UnifoldCliResult } from "./types.js";

it("describes data-only invocations and results", () => {
  const invocation: UnifoldCliInvocation = {
    command: UnifoldCliCommand.Validate,
    inputPath: "ui.json"
  };
  const result: UnifoldCliResult = {
    diagnostics: [],
    message: "valid",
    status: UnifoldCliStatus.Succeeded
  };
  const check: UnifoldCliInvocation = {
    action: UnifoldCliModuleAction.Check,
    command: UnifoldCliCommand.Module,
    lockPath: "ui.lock.json",
    manifestPath: "modules.json"
  };
  expect(invocation.inputPath).toBe("ui.json");
  expect(result.status).toBe(UnifoldCliStatus.Succeeded);
  expect(check.lockPath).toBe("ui.lock.json");
  expectTypeOf(result.diagnostics).toMatchTypeOf<readonly unknown[]>();
});
