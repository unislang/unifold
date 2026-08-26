import { describe, expect, it } from "vitest";
import * as subject from "./control.js";

describe("control module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
