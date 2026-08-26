import { expect, it } from "vitest";

import * as subject from "./index.js";

it("exposes the supported data protocol facade", () => {
  expect(subject.DataActorCoordinator).toBeTypeOf("function");
  expect(subject.DataQueryCache).toBeTypeOf("function");
  expect(subject.DataSourceRegistry).toBeTypeOf("function");
  expect(subject.isDataRequest).toBeTypeOf("function");
});
