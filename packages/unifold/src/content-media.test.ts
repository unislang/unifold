import { expect, it } from "vitest";

import * as contentMedia from "./content-media.js";

it("publishes the deferred content/media family", () => {
  expect(contentMedia.defineUnifoldCard).toBeTypeOf("function");
  expect(contentMedia.defineUnifoldImage).toBeTypeOf("function");
});
