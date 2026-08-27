import { describe, expect, it } from "vitest";
import * as subject from "./component.js";

describe("component module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
    expect(subject.CoreComponentType.Pagination).toBe("Pagination");
    expect(subject.CoreComponentType.Toast).toBe("Toast");
  });
});
