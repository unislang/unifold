import { describe, expect, it } from "vitest";
import * as subject from "./registry.js";

describe("registry module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
