export {
  JsonUiCompatibilityExpectation,
  JsonUiCorpusOrigin,
  JsonUiFeature,
  JsonUiFeatureDisposition,
  JsonUiFixtureLicense,
  JsonUiProfileLimit,
  JsonUiProfileDiagnosticCode,
  JsonUiUpstreamPackageVersion
} from "./enums.js";
export { JSONUI_COMPATIBILITY_CORPUS } from "./corpus.js";
export { UNIFOLD_JSONUI_PROFILE } from "./profile.js";
export type {
  JsonUiCompatibilityCase,
  JsonUiCompatibilityDiagnosticExpectation,
  JsonUiCorpusProvenance,
  JsonUiProfileDescriptor,
  JsonUiProfileDiagnostic,
  JsonUiProfileValidationResult
} from "./types.js";
export { validateJsonUiProfileDocument } from "./validation.js";
