import { describe, expect, it } from "vitest";

import { SemanticGraphValidationError, assertSemanticGraph } from "./validation.js";
import { validGraph } from "./validation.test-data.js";

describe("assertSemanticGraph", () => {
  it("accepts the executable JSON Schema contract", () => {
    expect(() => assertSemanticGraph(validGraph)).not.toThrow();
  });

  it("returns paths and keywords for invalid untrusted JSON", () => {
    const invalid = { ...validGraph, unexpected: true, vocabulary: { release: "pending" } };
    try {
      assertSemanticGraph(invalid);
      throw new Error("Expected schema validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(SemanticGraphValidationError);
      const diagnostics = (error as SemanticGraphValidationError).diagnostics;
      expect(diagnostics.map((item) => item.keyword)).toContain("additionalProperties");
      expect(diagnostics.map((item) => item.path)).toContain("/vocabulary");
    }
  });
});
