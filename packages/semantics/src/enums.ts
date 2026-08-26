export {
  SchemaOrgRelease,
  SchemaOrgVocabularyUri,
  SemanticContractVersion,
  SemanticPublicationMode,
  SemanticPublicationProfile,
  SemanticValueKind
} from "@unislang/unifold-contracts";

export enum SemanticCompilationStatus {
  Valid = "valid",
  Invalid = "invalid"
}

export enum SemanticDiagnosticSeverity {
  Error = "error",
  Warning = "warning"
}

export enum SemanticDiagnosticCode {
  DuplicateEntityId = "duplicate-entity-id",
  EmptyEntityId = "empty-entity-id",
  MissingControl = "missing-control",
  MissingEntity = "missing-entity",
  MissingNode = "missing-node",
  InvalidCompositionExport = "invalid-composition-export",
  NonPublicBinding = "non-public-binding",
  UnknownProperty = "unknown-property",
  UnknownType = "unknown-type",
  UnsupportedRelease = "unsupported-release",
  InvisibleBinding = "invisible-binding"
}
