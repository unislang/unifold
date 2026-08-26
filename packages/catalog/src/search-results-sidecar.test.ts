import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { ComponentAccessibilityPattern } from "./definition-enums.js";
import { searchResultsSidecar } from "./search-results-sidecar.js";

it("pins SearchResults browser, privacy, and accessibility evidence", () => {
  expect(searchResultsSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.SearchResults },
    componentType: CoreComponentType.SearchResults,
    testManifest: {
      browserScenarios: ["queries and selects a virtualized search-results collection"]
    }
  });
  expect(searchResultsSidecar.privacy.sensitiveProperties).toContain("results");
});
