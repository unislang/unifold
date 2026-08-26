import { expect, it } from "vitest";

import * as subject from "./async-store-types.js";

it("loads the async store type contract without runtime side effects", () => {
  expect(subject).toBeDefined();
});
