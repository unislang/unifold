import { describe, expect, it } from "vitest";
import * as subject from "./enums.js";

describe("enums module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
