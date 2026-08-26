import {
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision
} from "@unislang/unifold-contracts";

import { JsonUiFeature, JsonUiFeatureDisposition, JsonUiUpstreamPackageVersion } from "./enums.js";
import type { JsonUiProfileDescriptor } from "./types.js";

const features: Readonly<Record<JsonUiFeature, JsonUiFeatureDisposition>> = Object.freeze({
  [JsonUiFeature.Action]: JsonUiFeatureDisposition.Rejected,
  [JsonUiFeature.ComponentTree]: JsonUiFeatureDisposition.Compiled,
  [JsonUiFeature.DefaultSlotArray]: JsonUiFeatureDisposition.Compiled,
  [JsonUiFeature.InlineValidation]: JsonUiFeatureDisposition.Rejected,
  [JsonUiFeature.Jsonata]: JsonUiFeatureDisposition.Rejected,
  [JsonUiFeature.List]: JsonUiFeatureDisposition.Rejected,
  [JsonUiFeature.Localization]: JsonUiFeatureDisposition.Rejected,
  [JsonUiFeature.Modifier]: JsonUiFeatureDisposition.Rejected,
  [JsonUiFeature.NamedSlot]: JsonUiFeatureDisposition.Rejected,
  [JsonUiFeature.PrimitiveChild]: JsonUiFeatureDisposition.Rejected,
  [JsonUiFeature.StableNodeId]: JsonUiFeatureDisposition.RequiredExtension,
  [JsonUiFeature.StateExport]: JsonUiFeatureDisposition.Rejected,
  [JsonUiFeature.StorePathBinding]: JsonUiFeatureDisposition.RequiredExtension,
  [JsonUiFeature.UnknownDirective]: JsonUiFeatureDisposition.Rejected
});

export const UNIFOLD_JSONUI_PROFILE: JsonUiProfileDescriptor = Object.freeze({
  features,
  name: JsonUiProfileName.Unifold,
  upstreamPackageVersion: JsonUiUpstreamPackageVersion.Version01025,
  upstreamRevision: JsonUiUpstreamRevision.Version01025,
  version: JsonUiProfileVersion.Version1
});
