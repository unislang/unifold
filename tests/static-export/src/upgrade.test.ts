import { describe, expect, it } from "vitest";

import { isManualUpgrade } from "./upgrade.js";

describe("static upgrade mode", () => {
  it("requires an explicit upgrade when requested", () => {
    expect(isManualUpgrade({ search: "?upgrade=manual" })).toBe(true);
  });

  it("upgrades automatically by default", () => {
    expect(isManualUpgrade({ search: "" })).toBe(false);
  });
});
