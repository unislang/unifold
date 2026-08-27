import { expect, expectTypeOf, it } from "vitest";

import { UnifoldCliCommand, UnifoldCliStatus } from "./enums.js";
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
  expect(invocation.inputPath).toBe("ui.json");
  expect(result.status).toBe(UnifoldCliStatus.Succeeded);
  expectTypeOf(result.diagnostics).toMatchTypeOf<readonly unknown[]>();
});
