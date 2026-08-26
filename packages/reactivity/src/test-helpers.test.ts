import { describe, expect, it } from "vitest";
import * as subject from "./test-helpers.js";

describe("test-helpers module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
