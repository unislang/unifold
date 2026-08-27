// @vitest-environment happy-dom
import { expect, it } from "vitest";

import * as toastFamily from "./toast-entry.js";

it("exposes only the deferred Toast feature boundary", () => {
  expect(Object.keys(toastFamily).sort()).toEqual(["UnifoldToast", "defineUnifoldToast"]);
});
