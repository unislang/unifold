export enum CompositionContractVersion {
  Version1 = "1.0.0"
}

export enum CompositionExpansionStatus {
  Invalid = "invalid",
  Valid = "valid"
}

export enum LayoutExpansionStatus {
  Invalid = "invalid",
  NotLayout = "not-layout",
  Valid = "valid"
}

export enum LayoutEventName {
  Blur = "onBlur",
  Click = "onClick",
  Input = "onInput",
  Reset = "onReset",
  Submit = "onSubmit"
}

export enum LayoutVariableType {
  Array = "array",
  Boolean = "boolean",
  Nodes = "nodes",
  Number = "number",
  Object = "object",
  String = "string"
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
  InvalidLayout = "invalid-layout-document",
  InvalidLayoutEvent = "invalid-layout-event",
  InvalidLayoutNode = "invalid-layout-node",
  InvalidLayoutVariable = "invalid-layout-variable",
  MaxDepth = "composition-max-depth",
  MissingParameter = "missing-composition-parameter",
  MissingSlot = "missing-composition-slot",
  MissingSlotPlaceholder = "missing-composition-slot-placeholder",
  MultipleSlot = "multiple-nodes-for-single-composition-slot",
  UnknownComposition = "unknown-composition",
  UnknownLayout = "unknown-layout",
  UnknownLayoutVariable = "unknown-layout-variable",
  UnknownExport = "unknown-composition-export",
  UnknownParameter = "unknown-composition-parameter",
  UnknownSlot = "unknown-composition-slot"
}
