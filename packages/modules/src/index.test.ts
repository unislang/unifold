import { expect, it } from "vitest";

import * as subject from "./index.js";

it("exports the supported UiModule contract and resolver surface", () => {
  expect(subject.createUiModuleRegistry).toBeTypeOf("function");
  expect(subject.resolveUiModule).toBeTypeOf("function");
  expect(subject.createUiModuleLock).toBeTypeOf("function");
  expect(subject.validateUiModuleLock).toBeTypeOf("function");
  expect(subject.uiModuleIntegrity).toBeTypeOf("function");
  expect(subject.UiModuleSchemaVersion.Version1).toBe("1.0.0");
});
