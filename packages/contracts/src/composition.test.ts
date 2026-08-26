import { describe, expect, it } from "vitest";
import * as subject from "./composition.js";

describe("composition module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
