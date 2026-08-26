// @vitest-environment happy-dom
import { expect, it } from "vitest";

import {
  disposeSearchResults,
  exerciseSearchResults,
  mountSearchResults,
  SEARCH_RESULT_RENDER_LIMIT
} from "./search-results-fixture.js";

it("queries and selects 10,000 native JSON search results with bounded DOM", async () => {
  const mounted = await mountSearchResults();
  try {
    const evidence = await exerciseSearchResults(mounted.element);
    expect(evidence.renderedOptions).toBeLessThanOrEqual(SEARCH_RESULT_RENDER_LIMIT);
    expect(evidence.valueQuery).toBe("Grace");
    expect(evidence.selectedResultId).toBe("result-00001");
  } finally {
    disposeSearchResults(mounted);
  }
});
