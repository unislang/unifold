import { describe, expect, it } from "vitest";
import * as subject from "./manifest.js";

describe("manifest module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
