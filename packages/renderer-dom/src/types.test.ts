import { describe, expect, it } from "vitest";
import { FocusRestoreStatus } from "./types.js";

describe("types module", () => {
  it("defines closed focus settlement values", () => {
    expect(Object.values(FocusRestoreStatus)).toEqual(["focused", "not-focused"]);
  });
});
