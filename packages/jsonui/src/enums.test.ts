import { expect, it } from "vitest";

import {
  JsonUiFeature,
  JsonUiFeatureDisposition,
  JsonUiFixtureLicense,
  JsonUiCorpusOrigin,
  JsonUiProfileDiagnosticCode,
  JsonUiProfileLimit
} from "./enums.js";

it("exports stable enum-backed profile vocabulary", () => {
  expect(JsonUiFeature.ComponentTree).toBe("component-tree");
  expect(JsonUiCorpusOrigin.UpstreamAdaptation).toBe("upstream-adaptation");
  expect(JsonUiFixtureLicense.Mit).toBe("MIT");
  expect(JsonUiFeatureDisposition.Rejected).toBe("rejected");
  expect(JsonUiProfileDiagnosticCode.UnsupportedFeature).toBe("unsupported-feature");
  expect(JsonUiProfileLimit.Components).toBe(10_000);
  expect(JsonUiProfileLimit.TraversedObjects).toBe(50_000);
});
