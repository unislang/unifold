export enum CompositionContractVersion {
  Version1 = "1.0.0"
}

export enum CompositionExpansionStatus {
  Invalid = "invalid",
  Valid = "valid"
}

export enum CompositionIdentitySegmentKind {
  Node = "node",
  Slot = "slot"
}

export enum CompositionParameterType {
  Boolean = "boolean",
  Number = "number",
  String = "string"
}

export enum CompositionDiagnosticCode {
  Cycle = "composition-cycle",
  DuplicateDefinition = "duplicate-composition-definition",
  DuplicateNodeId = "duplicate-composition-node-id",
  DuplicateSlot = "duplicate-composition-slot",
  DuplicateSlotPlaceholder = "duplicate-composition-slot-placeholder",
  InvalidDocument = "invalid-composed-document",
  InvalidParameter = "invalid-composition-parameter",
  InvalidParameterReference = "invalid-composition-parameter-reference",
  MaxDepth = "composition-max-depth",
  MissingParameter = "missing-composition-parameter",
  MissingSlot = "missing-composition-slot",
  MissingSlotPlaceholder = "missing-composition-slot-placeholder",
  MultipleSlot = "multiple-nodes-for-single-composition-slot",
  UnknownComposition = "unknown-composition",
  UnknownExport = "unknown-composition-export",
  UnknownParameter = "unknown-composition-parameter",
  UnknownSlot = "unknown-composition-slot"
}
