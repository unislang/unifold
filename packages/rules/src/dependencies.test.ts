import {
  UiDerivedRuleOutputKind,
  type UiControlSetDisabledRuleOutput
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  dependenciesOverlap,
  dependencyKey,
  outputDependencies,
  primaryOutputDependency
} from "./dependencies.js";

it("maps typed outputs to conservative state write footprints", () => {
  const output: UiControlSetDisabledRuleOutput = {
    kind: UiDerivedRuleOutputKind.ControlSetDisabled,
    nodeId: "submit"
  };
  expect(primaryOutputDependency(output).pointer).toBe("/base/disabled");
  expect(outputDependencies(output).map(({ pointer }) => pointer)).toEqual([
    "/base/disabled",
    "/control"
  ]);
});

it("matches only pointer-boundary overlaps on the same node", () => {
  const control = { nodeId: "amount", pointer: "/control" };
  expect(dependenciesOverlap(control, { nodeId: "amount", pointer: "/control/value" })).toBe(true);
  expect(dependenciesOverlap(control, { nodeId: "other", pointer: "/control/value" })).toBe(false);
  expect(dependencyKey(control)).toBe('["amount","/control"]');
});
