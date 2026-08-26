export enum ButtonAction {
  Button = "button",
  Reset = "reset",
  Submit = "submit"
}

export enum AlertTone {
  Danger = "danger",
  Info = "info",
  Success = "success",
  Warning = "warning"
}

export enum ButtonVariant {
  Primary = "primary",
  Secondary = "secondary",
  Quiet = "quiet"
}

export enum CatalogBindingKind {
  Attribute = "attribute",
  Property = "property"
}

export enum CatalogConstraintKind {
  AuditLogData = "audit-log-data",
  ChildCount = "child-count",
  DataGridState = "data-grid-state",
  MasterDetailState = "master-detail-state",
  SearchResultsState = "search-results-state",
  SelectionInOptions = "selection-in-options",
  StepNavigationState = "step-navigation-state",
  TableData = "table-data",
  UniqueOptionValues = "unique-option-values"
}

export enum CatalogPropertyType {
  AuditLogEntryList = "audit-log-entry-list",
  Boolean = "boolean",
  DataGridValue = "data-grid-value",
  Enum = "enum",
  MenuItemList = "menu-item-list",
  OptionList = "option-list",
  PositiveInteger = "positive-integer",
  SafeUrl = "safe-url",
  SearchResultList = "search-result-list",
  SearchResultsValue = "search-results-value",
  StepId = "step-id",
  StepList = "step-list",
  String = "string",
  StringArray = "string-array",
  TableColumnList = "table-column-list",
  TableRowList = "table-row-list"
}

export enum ComponentAccessibilityPattern {
  AuditTimeline = "audit-timeline",
  Disclosure = "disclosure",
  Group = "group",
  GridLayout = "grid-layout",
  LiveRegion = "live-region",
  MasterDetail = "master-detail",
  MenuButton = "menu-button",
  NativeButton = "native-button",
  NativeCheckbox = "native-checkbox",
  Combobox = "combobox",
  NativeDataGrid = "native-data-grid",
  NativeForm = "native-form",
  NativeHeading = "native-heading",
  NativeLink = "native-link",
  NativeRadioGroup = "native-radio-group",
  NativeSelect = "native-select",
  NativeTable = "native-table",
  NativeTextInput = "native-text-input",
  SearchResults = "search-results",
  StepNavigation = "step-navigation",
  Tabs = "tabs",
  Tooltip = "tooltip",
  Listbox = "listbox",
  StaticText = "static-text",
  SvgImage = "svg-image"
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

export enum CoreElementTag {
  Accordion = "unifold-accordion",
  Alert = "unifold-alert",
  AuditLog = "unifold-audit-log",
  Box = "unifold-box",
  Button = "unifold-button",
  Checkbox = "unifold-checkbox",
  Combobox = "unifold-combobox",
  Composition = "unifold-composition",
  DataGrid = "unifold-data-grid",
  Form = "unifold-form",
  Grid = "unifold-grid",
  Heading = "unifold-heading",
  Icon = "unifold-icon",
  Link = "unifold-link",
  MasterDetail = "unifold-master-detail",
  MenuButton = "unifold-menu-button",
  MultiSelect = "unifold-multi-select",
  RadioGroup = "unifold-radio-group",
  SearchResults = "unifold-search-results",
  Select = "unifold-select",
  Stack = "unifold-stack",
  Stepper = "unifold-stepper",
  Tabs = "unifold-tabs",
  Table = "unifold-table",
  Text = "unifold-text",
  TextArea = "unifold-text-area",
  TextField = "unifold-text-field",
  Tooltip = "unifold-tooltip",
  VirtualList = "unifold-virtual-list",
  Wizard = "unifold-wizard"
}

export enum DataGridSelectionMode {
  Multiple = "multiple",
  None = "none",
  Single = "single"
}

export enum DataGridSortDirection {
  Ascending = "ascending",
  Descending = "descending"
}

export enum HeadingLevel {
  One = "1",
  Two = "2",
  Three = "3",
  Four = "4",
  Five = "5",
  Six = "6"
}

export enum IconName {
  Check = "check",
  ExternalLink = "external-link",
  Help = "help",
  Info = "info",
  Search = "search",
  Warning = "warning"
}

export enum IconSize {
  Large = "lg",
  Medium = "md",
  Small = "sm"
}

export enum IconTone {
  Danger = "danger",
  Default = "default",
  Muted = "muted",
  Primary = "primary",
  Success = "success",
  Warning = "warning"
}

export enum LayoutAlignment {
  Center = "center",
  End = "end",
  Start = "start",
  Stretch = "stretch"
}

export enum LayoutSpace {
  Large = "lg",
  Medium = "md",
  None = "none",
  Small = "sm",
  ExtraLarge = "xl"
}

export enum LinkTarget {
  Blank = "_blank",
  Self = "_self"
}

export enum StackDirection {
  Horizontal = "horizontal",
  Vertical = "vertical"
}

export enum StepperOrientation {
  Horizontal = "horizontal",
  Vertical = "vertical"
}

export enum TabActivationMode {
  Automatic = "automatic",
  Manual = "manual"
}

export enum SurfaceTone {
  Default = "default",
  Subtle = "subtle",
  Transparent = "transparent"
}

export enum TextSize {
  Large = "lg",
  Medium = "md",
  Small = "sm"
}

export enum TextTone {
  Danger = "danger",
  Default = "default",
  Muted = "muted"
}

export enum TextWeight {
  Bold = "bold",
  Medium = "medium",
  Normal = "normal",
  Semibold = "semibold"
}

export enum TextAreaWrap {
  Hard = "hard",
  Soft = "soft"
}

export enum TextFieldInputType {
  Email = "email",
  Password = "password",
  Search = "search",
  Tel = "tel",
  Text = "text",
  Url = "url"
}

export enum TooltipPlacement {
  Bottom = "bottom",
  End = "end",
  Start = "start",
  Top = "top"
}
