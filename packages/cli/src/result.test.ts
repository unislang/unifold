import { expect, it } from "vitest";

import { UnifoldCliDiagnosticCode, UnifoldCliStatus } from "./enums.js";
import { cliFailure, cliSuccess } from "./result.js";

it("creates stable success and failure results", () => {
  expect(cliSuccess("done")).toEqual({
    diagnostics: [],
    message: "done",
    status: UnifoldCliStatus.Succeeded
  });
  expect(
    cliFailure("failed", [{ code: UnifoldCliDiagnosticCode.InvocationInvalid, message: "invalid" }])
  ).toMatchObject({ status: UnifoldCliStatus.Failed });
});
