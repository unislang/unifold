import { describe, expect, it } from "vitest";
import * as subject from "./index.js";

describe("index module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
