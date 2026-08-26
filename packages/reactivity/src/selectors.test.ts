import { UiValidationSeverity } from "@unislang/unifold-events";
import { describe, expect, it } from "vitest";
import { NormalizedNodeStore } from "./node-store.js";
import { metadata } from "./lifecycle.test-data.js";
import { controlNode } from "./test-helpers.js";
import { validationErrorsSelector } from "./selectors.js";
import * as subject from "./selectors.js";

describe("selectors module", () => {
  it("loads through its colocated contract", () => {
    expect(subject).toBeDefined();
  });
});

it("selects routed validation errors by affected node ID", () => {
  const store = new NormalizedNodeStore([controlNode("owner", ""), controlNode("target", "")]);
  const selection = store.select(validationErrorsSelector("target"));
  store.transact(metadata("route"), (draft) => {
    draft.update("owner", (node) => {
      if (node.control === undefined) throw new Error("Owner control is missing.");
      node.control.errors = [
        {
          affectedIds: ["target"],
          code: "match",
          messageKey: "validation.match",
          ownerId: "owner",
          severity: UiValidationSeverity.Error,
          validatorId: "match"
        }
      ];
    });
  });
  expect(selection.get()).toMatchObject([{ ownerId: "owner" }]);
});
