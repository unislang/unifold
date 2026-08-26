import { describe, expect, it } from "vitest";
import * as subject from "./runtime-helpers.js";

describe("runtime-helpers module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
