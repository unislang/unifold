import { expect, it } from "vitest";

import { SelectionIndex, type SelectionIndexEntry } from "./selection-index.js";

it("returns only global and changed-node candidates", () => {
  const index = new SelectionIndex<TestSelection>();
  const first = selection("first", ["first"]);
  const second = selection("second", ["second"]);
  const both = selection("both", ["first", "second"]);
  const global = selection("global");
  [first, second, both, global].forEach((item) => index.add(item));

  expect([...index.candidates(new Set(["first"]))]).toEqual([global, first, both]);
  expect(index.size).toBe(4);
});

it("deduplicates dependencies and removes every index entry", () => {
  const index = new SelectionIndex<TestSelection>();
  const target = selection("target", ["first", "first", "second"]);
  index.add(target);

  expect([...index.candidates(new Set(["first", "second"]))]).toEqual([target]);
  index.delete(target);
  expect(index.candidates(new Set(["first", "second"])).size).toBe(0);
  expect(index.values()).toEqual([]);
});

interface TestSelection extends SelectionIndexEntry {
  readonly name: string;
}

function selection(name: string, nodeIds?: readonly string[]): TestSelection {
  return { name, nodeIds };
}
