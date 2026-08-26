import { describe, expect, it } from "vitest";
import * as subject from "./validation.js";

describe("validation module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
