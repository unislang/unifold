import { describe, expect, it } from "vitest";
import * as subject from "./types.js";

describe("types module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
