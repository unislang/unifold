import { describe, expect, it } from "vitest";
import * as subject from "./transaction.js";

describe("transaction module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
