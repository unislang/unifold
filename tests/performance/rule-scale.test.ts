import { expect, it } from "vitest";

import {
  RULE_SCALE_COUNT,
  RULES_PER_CHAIN,
  createRuleScaleHarness,
  evaluateRuleChain,
  ruleNodeId
} from "./rule-scale-fixture.js";

it("evaluates only 25 transitive dependents in the reference 1,000-rule graph", () => {
  const harness = createRuleScaleHarness();
  const result = evaluateRuleChain(harness, 7, 10);

  expect(harness.program.rules).toHaveLength(RULE_SCALE_COUNT);
  expect(result.evaluatedRuleIds).toHaveLength(RULES_PER_CHAIN);
  expect(result.commands).toHaveLength(RULES_PER_CHAIN);
  expect(result.evaluatedRuleIds).toEqual(
    Array.from(
      { length: RULES_PER_CHAIN },
      (_, index) => `chain-007-rule-${index.toString().padStart(3, "0")}`
    )
  );
  expect(harness.state.get(key(ruleNodeId(7, RULES_PER_CHAIN - 1)))).toBe(35);
  expect(harness.state.get(key(ruleNodeId(8, RULES_PER_CHAIN - 1)))).toBe(0);
});

function key(nodeId: string): string {
  return JSON.stringify([nodeId, "/properties/value"]);
}
