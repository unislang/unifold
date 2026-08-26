import { describe, expect, it } from "vitest";
import * as subject from "./json-safety.js";

describe("json-safety module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
