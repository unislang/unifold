// @vitest-environment happy-dom
import { expect, it } from "vitest";

import * as switchFamily from "./switch-entry.js";

it("exposes the deferred Switch feature entry", () => {
  expect(Object.keys(switchFamily).sort()).toEqual(["UnifoldSwitch", "defineUnifoldSwitch"]);
});
