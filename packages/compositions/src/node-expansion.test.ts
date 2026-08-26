import { describe, expect, it } from "vitest";
import * as subject from "./node-expansion.js";

describe("node-expansion module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
