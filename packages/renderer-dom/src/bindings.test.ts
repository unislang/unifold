import { describe, expect, it } from "vitest";
import * as subject from "./bindings.js";

describe("bindings module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
