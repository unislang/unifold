import { expect, it } from "vitest";

import {
  BOOLEAN_CONDITION_DECISIONS,
  ConditionDecision,
  LAYOUT_NODE_KEYS
} from "./layout-node-configuration.js";

it("defines enum-backed layout condition decisions and admitted node keys", () => {
  expect(BOOLEAN_CONDITION_DECISIONS).toEqual({
    false: ConditionDecision.Exclude,
    true: ConditionDecision.Include
  });
  expect(LAYOUT_NODE_KEYS).toContain("collection");
  expect(LAYOUT_NODE_KEYS).toContain("emptyFocusTarget");
});
