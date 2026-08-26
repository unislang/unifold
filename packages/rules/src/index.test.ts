import { expect, it } from "vitest";

import * as subject from "./index.js";

it("loads the complete public rules facade", () => {
  expect(subject.compileDerivedRules).toBeTypeOf("function");
  expect(subject.evaluateAffectedRules).toBeTypeOf("function");
  expect(subject.JsonLogicOperator.Variable).toBe("var");
});
