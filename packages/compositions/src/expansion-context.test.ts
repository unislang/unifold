import { describe, expect, it } from "vitest";
import * as subject from "./expansion-context.js";

describe("expansion-context module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
