import { UiCommandType } from "@unislang/unifold-events";
import { describe, expect, it } from "vitest";
import * as subject from "./runtime-helpers.js";

describe("runtime-helpers module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });

  it("selects the first changed command target as transaction provenance", () => {
    expect(
      subject.transactionSourceId(
        [
          { type: UiCommandType.FocusRequest, id: "first" },
          { type: UiCommandType.ControlSetValue, id: "second", value: "Ada" }
        ],
        ["aggregate", "second"]
      )
    ).toBe("second");
    expect(
      subject.transactionSourceId(
        [{ type: UiCommandType.FocusRequest, id: "first" }],
        ["aggregate"]
      )
    ).toBeUndefined();
  });
});
