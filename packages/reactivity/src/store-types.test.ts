import { describe, expect, it } from "vitest";
import * as subject from "./store-types.js";

describe("store-types module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
