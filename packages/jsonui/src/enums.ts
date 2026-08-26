export enum JsonUiCompatibilityExpectation {
  Compatible = "compatible",
  Incompatible = "incompatible"
}

export enum JsonUiCorpusOrigin {
  ProfileFixture = "profile-fixture",
  UpstreamAdaptation = "upstream-adaptation"
}

export enum JsonUiFixtureLicense {
  Mit = "MIT"
}

export enum JsonUiFeature {
  Action = "action",
  ComponentTree = "component-tree",
  DefaultSlotArray = "default-slot-array",
  InlineValidation = "inline-validation",
  Jsonata = "jsonata",
  List = "list",
  Localization = "localization",
  Modifier = "modifier",
  NamedSlot = "named-slot",
  PrimitiveChild = "primitive-child",
  StableNodeId = "stable-node-id",
  StateExport = "state-export",
  StorePathBinding = "store-path-binding",
  UnknownDirective = "unknown-directive"
}

export enum JsonUiFeatureDisposition {
  Compiled = "compiled",
  Rejected = "rejected",
  RequiredExtension = "required-extension"
}

export enum JsonUiProfileDiagnosticCode {
  InvalidName = "invalid-profile-name",
  InvalidProfileShape = "invalid-profile-shape",
  InvalidView = "invalid-view",
  InvalidUpstreamRevision = "invalid-upstream-revision",
  InvalidVersion = "invalid-profile-version",
  ResourceLimit = "resource-limit",
  TraversalCycle = "traversal-cycle",
  UnknownProfileProperty = "unknown-profile-property",
  UnsupportedFeature = "unsupported-feature"
}

export enum JsonUiProfileLimit {
  Components = 10000,
  Diagnostics = 100,
  Depth = 64,
  TraversedObjects = 50000
}

export enum JsonUiUpstreamPackageVersion {
  Version01025 = "0.10.25"
}
