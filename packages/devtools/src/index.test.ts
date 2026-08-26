import { expect, it } from "vitest";

import * as devtools from "./index.js";

it("exports the bounded devtools surface", () => {
  expect(devtools.DevtoolsTimeline).toBeTypeOf("function");
  expect(devtools.UnifoldDevtoolsSession).toBeTypeOf("function");
  expect(devtools.createDocumentDiff).toBeTypeOf("function");
  expect(devtools.inspectNodes).toBeTypeOf("function");
  expect(devtools.replayDocument).toBeTypeOf("function");
});
