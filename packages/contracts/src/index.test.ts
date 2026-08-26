import { describe, expect, it } from "vitest";
import * as subject from "./index.js";

describe("index module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
    expect(subject.maximumDataClassification).toBeTypeOf("function");
    expect(subject.SemanticValueKind.NodeControlValue).toBe("node-control-value");
    expect(subject.UiDerivedRuleOutputKind.ControlSetValue).toBe("control-set-value");
  });
});
