export enum ComponentAccessibilityPattern {
  Article = "article",
  AuditTimeline = "audit-timeline",
  Breadcrumb = "breadcrumb",
  Combobox = "combobox",
  Disclosure = "disclosure",
  ErrorSummary = "error-summary",
  FieldGroup = "field-group",
  GridLayout = "grid-layout",
  Group = "group",
  Listbox = "listbox",
  LiveRegion = "live-region",
  MasterDetail = "master-detail",
  MenuButton = "menu-button",
  ModalDialog = "modal-dialog",
  NativeButton = "native-button",
  NativeCheckbox = "native-checkbox",
  NativeDataGrid = "native-data-grid",
  NativeFieldset = "native-fieldset",
  NativeFileInput = "native-file-input",
  NativeForm = "native-form",
  NativeHeading = "native-heading",
  NativeImage = "native-image",
  NativeLink = "native-link",
  NativeNumberInput = "native-number-input",
  NativeRadioGroup = "native-radio-group",
  NativeSelect = "native-select",
  NativeTable = "native-table",
  NativeTextInput = "native-text-input",
  Popover = "popover",
  SearchResults = "search-results",
  StaticText = "static-text",
  StepNavigation = "step-navigation",
  SvgImage = "svg-image",
  Tabs = "tabs",
  Tooltip = "tooltip"
}

export enum ComponentDataClassification {
  Inherit = "inherit"
}

export enum ComponentDefinitionSchemaVersion {
  Version1 = "1.0.0"
}

export enum ComponentCapability {
  CanonicalEventSnapshot = "canonical-event-snapshot",
  JsonConstructible = "json-constructible",
  SelectiveProjection = "selective-projection",
  StableNodeIdentity = "stable-node-identity",
  ThemeTokens = "theme-tokens"
}

export enum ComponentEvidenceCheck {
  ForcedColors = "forced-colors",
  Keyboard = "keyboard",
  ScreenReader = "screen-reader",
  Zoom = "zoom"
}

export enum ComponentStatus {
  Deprecated = "deprecated",
  Experimental = "experimental",
  Stable = "stable"
}

export enum ComponentSemanticAttachmentKind {
  OrderedCollectionPosition = "ordered-collection-position",
  Property = "property",
  Subject = "subject"
}

export enum ComponentSemanticHiddenContentPolicy {
  Allowed = "allowed",
  Prohibited = "prohibited"
}

export enum ComponentSemanticNormalization {
  Date = "date",
  ImageUrl = "image-url",
  None = "none",
  Url = "url"
}

export enum ComponentSemanticValueSource {
  PublicProperty = "public-property",
  VisibleText = "visible-text"
}
