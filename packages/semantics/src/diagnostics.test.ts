import { describe, expect, it } from "vitest";
import * as subject from "./diagnostics.js";

describe("diagnostics module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
