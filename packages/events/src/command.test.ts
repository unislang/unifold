import { describe, expect, it } from "vitest";
import * as subject from "./command.js";

describe("command module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});
