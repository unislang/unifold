export enum CompilationStatus {
  Invalid = "invalid",
  Valid = "valid"
}

export { CoreComponentType } from "@unislang/unifold-contracts";

export enum DiagnosticCode {
  DerivedRuleBudgetExceeded = "derived-rule-budget-exceeded",
  DerivedRuleCycle = "derived-rule-cycle",
  DerivedRuleMultipleWriters = "derived-rule-multiple-writers",
  DuplicateStoreId = "duplicate-store-id",
  DuplicateAuditLogEntryId = "duplicate-audit-log-entry-id",
  DuplicateBreadcrumbItemId = "duplicate-breadcrumb-item-id",
  DuplicateOptionValue = "duplicate-option-value",
  DuplicateDataGridSelection = "duplicate-data-grid-selection",
  DuplicateDataGridSortableColumn = "duplicate-data-grid-sortable-column",
  DuplicateTableColumnKey = "duplicate-table-column-key",
  DuplicateTableRowId = "duplicate-table-row-id",
  DuplicateSearchResultId = "duplicate-search-result-id",
  DuplicateStepId = "duplicate-step-id",
  DuplicateTabId = "duplicate-tab-id",
  DuplicateMachineId = "duplicate-machine-id",
  DuplicateNodeId = "duplicate-node-id",
  InvalidCatalog = "invalid-catalog",
  InvalidChildCount = "invalid-child-count",
  InvalidCompositionExport = "invalid-composition-export",
  InvalidCompositionManifest = "invalid-composition-manifest",
  InvalidCompositionProvenance = "invalid-composition-provenance",
  InvalidDocument = "invalid-document",
  InvalidDerivedRule = "invalid-derived-rule",
  InvalidEventBinding = "invalid-event-binding",
  InvalidDataGridSelectionCount = "invalid-data-grid-selection-count",
  InvalidJson = "invalid-json",
  InvalidMachine = "invalid-machine",
  InvalidNode = "invalid-node",
  InvalidProfile = "invalid-profile",
  InvalidSchemaVersion = "invalid-schema-version",
  InvalidSemanticGraph = "invalid-semantic-graph",
  InvalidStoreBinding = "invalid-store-binding",
  InvalidStoreDefinition = "invalid-store-definition",
  InvalidStorePath = "invalid-store-path",
  DisabledStepSelection = "disabled-step-selection",
  DisabledTabSelection = "disabled-tab-selection",
  InvalidProperty = "invalid-property",
  MissingRequiredProperty = "missing-required-property",
  MissingBreadcrumbAncestorHref = "missing-breadcrumb-ancestor-href",
  StepChildCountMismatch = "step-child-count-mismatch",
  TabChildCountMismatch = "tab-child-count-mismatch",
  UnknownMachineOwner = "unknown-machine-owner",
  UnknownMachineState = "unknown-machine-state",
  UnknownMasterDetailColumn = "unknown-master-detail-column",
  UnknownMasterDetailSelection = "unknown-master-detail-selection",
  UnknownSearchResultSelection = "unknown-search-result-selection",
  UnknownStepSelection = "unknown-step-selection",
  UnknownTabSelection = "unknown-tab-selection",
  UnknownOptionSelection = "unknown-option-selection",
  UnknownDataGridSelection = "unknown-data-grid-selection",
  UnknownDataGridSortColumn = "unknown-data-grid-sort-column",
  UnknownDataGridSortableColumn = "unknown-data-grid-sortable-column",
  UnknownStore = "unknown-store",
  UnknownTableCell = "unknown-table-cell",
  UnsortableDataGridSortColumn = "unsortable-data-grid-sort-column",
  UnsupportedComponent = "unsupported-component",
  UnsupportedJsonUiFeature = "unsupported-jsonui-feature",
  UnsupportedProperty = "unsupported-property",
  UnexpectedStepChildren = "unexpected-step-children"
}

export enum DiagnosticSeverity {
  Error = "error",
  Warning = "warning"
}

export enum UnifoldIrVersion {
  Version1 = "1.0.0"
}

export enum StoreInputStatus {
  Forbidden = "forbidden",
  Invalid = "invalid",
  Missing = "missing",
  QuotaExceeded = "quota-exceeded",
  Valid = "valid",
  VersionMismatch = "version-mismatch"
}
