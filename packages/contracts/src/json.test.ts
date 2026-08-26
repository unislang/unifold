import { describe, expect, it } from "vitest";
import * as subject from "./json.js";

describe("json module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
