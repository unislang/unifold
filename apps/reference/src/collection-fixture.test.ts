// @vitest-environment happy-dom
import { expect, it } from "vitest";

import "./collection-fixture.js";

it("installs the bounded authored-collection browser fixture hooks", () => {
  const hooks = (
    window as unknown as {
      __unifoldCollectionFixture?: Readonly<Record<string, unknown>>;
    }
  ).__unifoldCollectionFixture;

  expect(Object.keys(hooks ?? {}).sort()).toEqual([
    "bypass",
    "empty",
    "insert",
    "mount",
    "move",
    "observe",
    "reject",
    "remove",
    "removeFocused"
  ]);
});
