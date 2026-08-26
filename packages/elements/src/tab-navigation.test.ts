import type { TabItem } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { keyboardTabIndex } from "./tab-navigation.js";

const tabs: readonly TabItem[] = [
  { id: "summary", label: "Summary" },
  { disabled: true, id: "billing", label: "Billing" },
  { id: "activity", label: "Activity" }
];

it("wraps enabled tabs across oriented arrows and deterministic boundaries", () => {
  expect(keyboardTabIndex(tabs, 0, "ArrowRight", false)).toBe(2);
  expect(keyboardTabIndex(tabs, 2, "ArrowRight", false)).toBe(0);
  expect(keyboardTabIndex(tabs, 0, "ArrowLeft", false)).toBe(2);
  expect(keyboardTabIndex(tabs, 0, "ArrowDown", true)).toBe(2);
  expect(keyboardTabIndex(tabs, 2, "Home", false)).toBe(0);
  expect(keyboardTabIndex(tabs, 0, "End", false)).toBe(2);
  expect(keyboardTabIndex(tabs, 0, "Enter", false)).toBeUndefined();
  expect(keyboardTabIndex([], 0, "Home", false)).toBe(-1);
});
