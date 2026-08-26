import { describe, expect, it } from "vitest";
import * as subject from "./styles.js";

describe("styles module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
