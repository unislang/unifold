import { describe, expect, it } from "vitest";
import * as subject from "./scenario.js";

describe("scenario module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
