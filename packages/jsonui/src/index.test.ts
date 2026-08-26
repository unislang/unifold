import { expect, it } from "vitest";

import * as subject from "./index.js";

it("exports the complete public profile surface", () => {
  expect(subject.UNIFOLD_JSONUI_PROFILE).toBeDefined();
  expect(subject.JSONUI_COMPATIBILITY_CORPUS.length).toBeGreaterThan(1);
  expect(subject.validateJsonUiProfileDocument).toBeTypeOf("function");
});
