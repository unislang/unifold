import {
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { JsonUiFeature, JsonUiFeatureDisposition } from "./enums.js";
import { UNIFOLD_JSONUI_PROFILE } from "./profile.js";

it("pins the named profile and upstream revision", () => {
  expect(UNIFOLD_JSONUI_PROFILE.name).toBe(JsonUiProfileName.Unifold);
  expect(UNIFOLD_JSONUI_PROFILE.version).toBe(JsonUiProfileVersion.Version1);
  expect(UNIFOLD_JSONUI_PROFILE.upstreamRevision).toBe(JsonUiUpstreamRevision.Version01025);
});

it("declares supported and rejected semantics explicitly", () => {
  expect(UNIFOLD_JSONUI_PROFILE.features[JsonUiFeature.ComponentTree]).toBe(
    JsonUiFeatureDisposition.Compiled
  );
  expect(UNIFOLD_JSONUI_PROFILE.features[JsonUiFeature.Action]).toBe(
    JsonUiFeatureDisposition.Rejected
  );
  expect(UNIFOLD_JSONUI_PROFILE.features[JsonUiFeature.StorePathBinding]).toBe(
    JsonUiFeatureDisposition.RequiredExtension
  );
});
