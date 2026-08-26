import { describe, expect, it } from "vitest";
import * as subject from "./node.js";

describe("node module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
