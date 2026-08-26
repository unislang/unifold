import { expect, it } from "vitest";

import {
  MAX_RENDERED_SEARCH_RESULTS,
  nextResultIndex,
  preferredResultIndex,
  resultScrollTop,
  resultWindow
} from "./search-results-window.js";

const results = Array.from({ length: 10_000 }, (_, index) => ({
  id: `result-${index}`,
  title: `Result ${index}`
}));

it("bounds windows and retains selected or active identity", () => {
  const input = {
    activeIndex: 9_000,
    itemHeight: 1,
    overscan: 100,
    results,
    scrollTop: 9_000,
    viewportHeight: 1_000
  };
  const window = resultWindow(input);
  expect(window.results).toHaveLength(MAX_RENDERED_SEARCH_RESULTS);
  expect(window.start).toBe(8_900);
  expect(preferredResultIndex(results, "result-9999", "result-4")).toBe(9_999);
  expect(preferredResultIndex(results, "", "result-4")).toBe(4);
  expect(nextResultIndex(3, 2, 1)).toBe(0);
  expect(resultScrollTop({ ...input, activeIndex: 8_000 }, window)).toBe(8_000);
});
