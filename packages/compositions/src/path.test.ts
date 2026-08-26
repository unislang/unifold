import { describe, expect, it } from "vitest";
import * as subject from "./path.js";

describe("path module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
