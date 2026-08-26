import { describe, expect, it } from "vitest";
import * as subject from "./component.js";

describe("component module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
