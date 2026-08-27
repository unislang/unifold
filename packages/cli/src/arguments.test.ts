import { describe, expect, it } from "vitest";

import { UnifoldCliCommand, UnifoldCliDiagnosticCode, UnifoldCliModuleAction } from "./enums.js";
import { parseUnifoldCliArguments } from "./arguments.js";

const INVALID_INVOCATIONS = [
  { arguments_: [] },
  { arguments_: ["unknown"] },
  { arguments_: ["validate"] },
  { arguments_: ["validate", "ui.json", "--no-install"] },
  { arguments_: ["generate", "starter", "demo"] },
  { arguments_: ["generate", "other", "demo", "--no-install"] },
  { arguments_: ["validate", "one.json", "two.json"] },
  { arguments_: ["module", "flatten", "modules.json", "--output", "out.json"] },
  { arguments_: ["module", "validate", "modules.json", "--lock", "lock.json"] },
  { arguments_: ["module", "check", "modules.json"] },
  { arguments_: ["module", "check", "modules.json", "--lock", "lock.json", "--output", "x"] }
] as const;

describe("supported CLI argument parsing", () => {
  it("parses validate and no-install starter invocations", () => {
    expect(parseUnifoldCliArguments(["validate", "ui.json"])).toEqual({
      invocation: { command: UnifoldCliCommand.Validate, inputPath: "ui.json" }
    });
    expect(parseUnifoldCliArguments(["generate", "starter", "demo", "--no-install"])).toMatchObject(
      { invocation: { command: UnifoldCliCommand.Generate, directory: "demo" } }
    );
  });
});

describe("invalid CLI argument parsing", () => {
  it.each(INVALID_INVOCATIONS)("rejects invocation $arguments_", ({ arguments_ }) => {
    expect(parseUnifoldCliArguments(arguments_)).toMatchObject({
      diagnostic: { code: UnifoldCliDiagnosticCode.InvocationInvalid }
    });
  });
});

it("parses every module action", () => {
  expectValidationInvocation();
  expectCheckInvocation();
  expectFlattenInvocation();
});

function expectValidationInvocation(): void {
  expect(parseUnifoldCliArguments(["module", "validate", "modules.json"])).toEqual({
    invocation: {
      action: UnifoldCliModuleAction.Validate,
      command: UnifoldCliCommand.Module,
      manifestPath: "modules.json"
    }
  });
}

function expectCheckInvocation(): void {
  expect(
    parseUnifoldCliArguments(["module", "check", "modules.json", "--lock", "dist/ui.lock.json"])
  ).toEqual({
    invocation: {
      action: UnifoldCliModuleAction.Check,
      command: UnifoldCliCommand.Module,
      lockPath: "dist/ui.lock.json",
      manifestPath: "modules.json"
    }
  });
}

function expectFlattenInvocation(): void {
  expect(
    parseUnifoldCliArguments([
      "module",
      "flatten",
      "modules.json",
      "--output",
      "dist/ui.json",
      "--lock",
      "dist/ui.lock.json"
    ])
  ).toMatchObject({
    invocation: {
      action: UnifoldCliModuleAction.Flatten,
      lockPath: "dist/ui.lock.json",
      outputPath: "dist/ui.json"
    }
  });
}
