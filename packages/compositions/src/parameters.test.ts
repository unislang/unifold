import { describe, expect, it } from "vitest";
import * as subject from "./parameters.js";

describe("parameters module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
