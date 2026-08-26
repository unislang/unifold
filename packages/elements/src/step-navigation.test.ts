import type { WorkflowStep } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import {
  boundaryStepIndex,
  currentStepIndex,
  keyboardStepIndex,
  nextEnabledStepIndex,
  preferredStepIndex
} from "./step-navigation.js";

const steps: readonly WorkflowStep[] = [
  { id: "account", label: "Account" },
  { disabled: true, id: "billing", label: "Billing" },
  { id: "review", label: "Review" }
];

it("resolves selected, retained, adjacent, boundary, and oriented step indices", () => {
  expect(currentStepIndex(steps, "review")).toBe(2);
  expect(currentStepIndex(steps, "missing")).toBe(0);
  expect(preferredStepIndex(steps, "account", "review")).toBe(2);
  expect(preferredStepIndex(steps, "account", "billing")).toBe(0);
  expect(nextEnabledStepIndex(steps, 0, 1)).toBe(2);
  expect(nextEnabledStepIndex(steps, 2, -1)).toBe(0);
  expect(boundaryStepIndex(steps, "first")).toBe(0);
  expect(boundaryStepIndex(steps, "last")).toBe(2);
  expect(keyboardStepIndex(steps, 0, "ArrowRight", false)).toBe(2);
  expect(keyboardStepIndex(steps, 2, "ArrowUp", true)).toBe(0);
  expect(keyboardStepIndex(steps, 0, "Enter", false)).toBeUndefined();
});
