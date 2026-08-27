import { describe, expect, it } from "vitest";
import * as subject from "./control.js";

describe("control module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });

  it("exposes enum-backed control topology values", () => {
    expect(Object.values(subject.UiCollectionOperationType)).toEqual(["insert", "move", "remove"]);
    expect(Object.values(subject.UiControlNodeKind)).toEqual([
      "array",
      "control",
      "form",
      "group",
      "record"
    ]);
    expect(subject.UiControlTopologyVersion.Version1).toBe("1.0.0");
  });
});
