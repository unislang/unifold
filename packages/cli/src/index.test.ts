import { expect, it } from "vitest";

import * as cli from "./index.js";

it("exports the supported CLI library surface", () => {
  expect(cli.generateUnifoldStarter).toBeTypeOf("function");
  expect(cli.parseUnifoldCliArguments).toBeTypeOf("function");
  expect(cli.runUnifoldCli).toBeTypeOf("function");
  expect(cli.runUiModuleCommand).toBeTypeOf("function");
  expect(cli.resolveUiModuleProject).toBeTypeOf("function");
  expect(cli.validateUnifoldDocument).toBeTypeOf("function");
  expect(cli.UnifoldCliStatus.Succeeded).toBe("succeeded");
});
