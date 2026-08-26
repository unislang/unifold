import { CoreComponentType } from "@unislang/unifold-contracts";

import {
  definition,
  exampleNode as node,
  urlProperty,
  visibleProperty,
  visibleSubject
} from "./definition-sidecar-helpers.js";
import { auditLogSidecar } from "./audit-log-sidecar.js";
import { comboboxSidecar } from "./combobox-sidecar.js";
import { ComponentAccessibilityPattern, IconName } from "./enums.js";
import { searchResultsSidecar } from "./search-results-sidecar.js";
import { menuButtonSidecar } from "./menu-sidecar.js";
import { tooltipSidecar } from "./tooltip-sidecar.js";
import { stepperSidecar, tabsSidecar, wizardSidecar } from "./workflow-sidecars.js";
import type { ComponentDefinitionSidecar } from "./types.js";

const contentScenario = "renders semantic content and publishes Link activation";
const layoutScenario = "renders nested token-based Box, Stack, and Grid primitives";
const nativeChoiceScenario = "routes native choice and disclosure controls through one stream";

const sidecars: Readonly<Record<CoreComponentType, ComponentDefinitionSidecar>> = Object.freeze({
  [CoreComponentType.Accordion]: definition({
    behaviors: ["Uses native details disclosure state", "Emits a controlled disclosure intent"],
    browserScenarios: [nativeChoiceScenario],
    componentType: CoreComponentType.Accordion,
    example: node(CoreComponentType.Accordion, "help", { label: "More help" }),
    pattern: ComponentAccessibilityPattern.Disclosure,
    purpose: "Reveal or hide one related content region without moving its authored DOM position.",
    requirementIds: ["A11Y.DISCLOSURE.NATIVE", "EVENT.CONTROL.INPUT"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["value"]
  }),
  [CoreComponentType.Alert]: definition({
    behaviors: ["Uses polite status semantics by default", "Escalates urgent tones to alert"],
    browserScenarios: [contentScenario],
    componentType: CoreComponentType.Alert,
    example: node(CoreComponentType.Alert, "notice", { content: "Saved", title: "Status" }),
    pattern: ComponentAccessibilityPattern.LiveRegion,
    purpose: "Announce contextual status or urgent feedback with native live-region semantics.",
    requirementIds: ["A11Y.ALERT.LIVE_REGION", "SEMANTICS.VISIBLE_CONTENT"],
    semanticAttachmentPoints: [
      visibleProperty("title", "title"),
      visibleProperty("content", "content")
    ],
    sensitiveProperties: ["content", "title"]
  }),
  [CoreComponentType.AuditLog]: auditLogSidecar,
  [CoreComponentType.Box]: definition({
    behaviors: ["Preserves authored child order", "Projects token-backed padding and surface"],
    browserScenarios: [layoutScenario],
    componentType: CoreComponentType.Box,
    example: node(CoreComponentType.Box, "panel", { label: "Summary" }),
    pattern: ComponentAccessibilityPattern.Group,
    purpose: "Group child components within a token-styled surface without changing identity.",
    requirementIds: ["A11Y.LAYOUT.DOM_ORDER", "THEME.TOKEN.LAYOUT"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["label"]
  }),
  [CoreComponentType.Button]: definition({
    behaviors: ["Uses native button activation", "Emits a canonical activation intent"],
    browserScenarios: ["orders component intent and committed facts in one stream"],
    componentType: CoreComponentType.Button,
    example: node(CoreComponentType.Button, "save", { label: "Save" }),
    pattern: ComponentAccessibilityPattern.NativeButton,
    purpose: "Invoke a declared application action with native keyboard and pointer activation.",
    requirementIds: ["A11Y.BUTTON.NATIVE", "EVENT.COMPONENT.ACTIVATED"],
    semanticAttachmentPoints: [],
    sensitiveProperties: []
  }),
  [CoreComponentType.Checkbox]: definition({
    behaviors: ["Uses a native checkbox", "Emits canonical change and blur intents"],
    browserScenarios: [
      "submits heterogeneous values, omits disabled controls, and resets atomically"
    ],
    componentType: CoreComponentType.Checkbox,
    example: node(CoreComponentType.Checkbox, "updates", { label: "Receive updates" }),
    pattern: ComponentAccessibilityPattern.NativeCheckbox,
    purpose: "Capture one boolean choice with labeled validation and selective projection.",
    requirementIds: ["A11Y.CHECKBOX.NATIVE", "EVENT.CONTROL.INPUT"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["errorMessage", "value"]
  }),
  [CoreComponentType.Combobox]: comboboxSidecar,
  [CoreComponentType.Composition]: definition({
    behaviors: ["Preserves expanded child identities", "Provides one accessible grouping boundary"],
    browserScenarios: ["expands the authored composition to deterministic executable node ids"],
    componentType: CoreComponentType.Composition,
    example: node(CoreComponentType.Composition, "profile", { label: "Profile editor" }),
    pattern: ComponentAccessibilityPattern.Group,
    purpose:
      "Host a reusable expanded composition without creating competing state or event roots.",
    requirementIds: ["A11Y.GROUP.LABEL", "COMPOSITION.IDENTITY.STABLE"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["label"]
  }),
  [CoreComponentType.DataGrid]: definition({
    behaviors: [
      "Uses native table, button, and selection-control semantics",
      "Emits complete controlled sort and selection values"
    ],
    browserScenarios: ["sorts and selects native JSON grid rows through canonical state"],
    componentType: CoreComponentType.DataGrid,
    example: node(CoreComponentType.DataGrid, "people-grid", {
      caption: "People",
      columns: [{ key: "name", label: "Name" }],
      rows: [{ cells: { name: "Ada" }, id: "ada" }],
      selectionMode: "single",
      sortableColumns: ["name"],
      value: { selectedRowIds: [] }
    }),
    pattern: ComponentAccessibilityPattern.NativeDataGrid,
    purpose: "Sort and select a bounded record collection with native tabular semantics.",
    requirementIds: [
      "A11Y.DATA_GRID.NATIVE",
      "EVENT.CONTROL.INPUT",
      "SECURITY.DATA_GRID.ESCAPED_CELLS"
    ],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["caption", "columns", "emptyMessage", "errorMessage", "rows", "value"]
  }),
  [CoreComponentType.Form]: definition({
    behaviors: [
      "Uses native form submission",
      "Projects aggregate errors and canonical form facts"
    ],
    browserScenarios: [
      "submits heterogeneous values, omits disabled controls, and resets atomically"
    ],
    componentType: CoreComponentType.Form,
    example: node(CoreComponentType.Form, "profile", { label: "Profile" }),
    pattern: ComponentAccessibilityPattern.NativeForm,
    purpose: "Coordinate descendant controls as one runtime-owned form aggregate.",
    requirementIds: ["A11Y.FORM.NATIVE", "EVENT.FORM.SUBMITTED"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["errorMessages"]
  }),
  [CoreComponentType.Grid]: definition({
    behaviors: ["Preserves authored child order", "Projects token-backed column and gap values"],
    browserScenarios: [layoutScenario],
    componentType: CoreComponentType.Grid,
    example: node(CoreComponentType.Grid, "summary", { columns: 2 }),
    pattern: ComponentAccessibilityPattern.GridLayout,
    purpose: "Arrange child components in a responsive visual grid without changing DOM order.",
    requirementIds: ["A11Y.LAYOUT.DOM_ORDER", "THEME.TOKEN.LAYOUT"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["label"]
  }),
  [CoreComponentType.Heading]: definition({
    behaviors: ["Renders the declared native heading level", "Escapes authored content"],
    browserScenarios: [contentScenario],
    componentType: CoreComponentType.Heading,
    example: node(CoreComponentType.Heading, "title", { content: "Support", level: "2" }),
    pattern: ComponentAccessibilityPattern.NativeHeading,
    purpose: "Expose document structure through a native heading with token-backed tone.",
    requirementIds: ["A11Y.HEADING.NATIVE", "SEMANTICS.VISIBLE_CONTENT"],
    semanticAttachmentPoints: [visibleSubject("content", "content")],
    sensitiveProperties: ["content"]
  }),
  [CoreComponentType.Icon]: definition({
    behaviors: ["Uses allowlisted local SVG data", "Hides unlabeled decorative icons"],
    browserScenarios: [contentScenario],
    componentType: CoreComponentType.Icon,
    example: node(CoreComponentType.Icon, "information", {
      label: "Information",
      name: IconName.Info
    }),
    pattern: ComponentAccessibilityPattern.SvgImage,
    purpose: "Render one allowlisted decorative or accessibly named vector icon without fetching.",
    requirementIds: ["A11Y.ICON.LABEL", "OSS.ICON.PROVENANCE"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["label"]
  }),
  [CoreComponentType.Link]: definition({
    behaviors: ["Uses native anchor navigation", "Emits a canonical activation intent"],
    browserScenarios: [contentScenario],
    componentType: CoreComponentType.Link,
    example: node(CoreComponentType.Link, "docs", { href: "#docs", label: "Documentation" }),
    pattern: ComponentAccessibilityPattern.NativeLink,
    purpose: "Navigate to one safe URL while preserving native link behavior and event evidence.",
    requirementIds: ["A11Y.LINK.NATIVE", "EVENT.COMPONENT.ACTIVATED", "SEMANTICS.URL"],
    semanticAttachmentPoints: [visibleProperty("label", "label"), urlProperty("url", "href")],
    sensitiveProperties: ["href", "label"]
  }),
  [CoreComponentType.MasterDetail]: definition({
    behaviors: [
      "Reuses the bounded listbox focus and windowing model",
      "Preserves selection and focus while replacing the visible detail"
    ],
    browserScenarios: ["selects and reflows a virtualized master-detail workspace"],
    componentType: CoreComponentType.MasterDetail,
    example: node(CoreComponentType.MasterDetail, "accounts", {
      columns: [
        { key: "name", label: "Name" },
        { key: "status", label: "Status" }
      ],
      label: "Accounts",
      masterColumn: "name",
      rows: [{ cells: { name: "Ada", status: "Active" }, id: "ada" }],
      value: "ada"
    }),
    pattern: ComponentAccessibilityPattern.MasterDetail,
    purpose:
      "Select one record from a bounded virtual master list and inspect its scalar detail fields.",
    requirementIds: [
      "A11Y.MASTER_DETAIL.FOCUS",
      "EVENT.CONTROL.INPUT",
      "PERF.MASTER_DETAIL.BOUNDED_DOM",
      "SECURITY.MASTER_DETAIL.ESCAPED_FIELDS"
    ],
    semanticAttachmentPoints: [],
    sensitiveProperties: [
      "columns",
      "detailLabel",
      "emptyMessage",
      "errorMessage",
      "label",
      "noSelectionMessage",
      "rows",
      "value"
    ]
  }),
  [CoreComponentType.MenuButton]: menuButtonSidecar,
  [CoreComponentType.MultiSelect]: definition({
    behaviors: ["Uses native multiple selection", "Emits complete string-array values"],
    browserScenarios: [
      "submits heterogeneous values, omits disabled controls, and resets atomically"
    ],
    componentType: CoreComponentType.MultiSelect,
    example: node(CoreComponentType.MultiSelect, "skills", { label: "Skills" }),
    pattern: ComponentAccessibilityPattern.NativeSelect,
    purpose: "Choose zero or more values from a bounded option list through a native control.",
    requirementIds: ["A11Y.SELECT.NATIVE", "EVENT.CONTROL.INPUT"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["errorMessage", "options", "value"]
  }),
  [CoreComponentType.RadioGroup]: definition({
    behaviors: ["Uses native fieldset and same-name radios", "Emits one scalar selection"],
    browserScenarios: [
      "commits a radio choice through the unified stream and updates only its group"
    ],
    componentType: CoreComponentType.RadioGroup,
    example: node(CoreComponentType.RadioGroup, "contact", { label: "Contact preference" }),
    pattern: ComponentAccessibilityPattern.NativeRadioGroup,
    purpose: "Choose one value from a visible bounded option group with native radio semantics.",
    requirementIds: ["A11Y.RADIO_GROUP.NATIVE", "EVENT.CONTROL.INPUT"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["errorMessage", "options", "value"]
  }),
  [CoreComponentType.SearchResults]: searchResultsSidecar,
  [CoreComponentType.Select]: definition({
    behaviors: ["Uses native single selection", "Emits canonical change and blur intents"],
    browserScenarios: [nativeChoiceScenario],
    componentType: CoreComponentType.Select,
    example: node(CoreComponentType.Select, "priority", { label: "Priority" }),
    pattern: ComponentAccessibilityPattern.NativeSelect,
    purpose: "Choose one value from a bounded option list through a native select control.",
    requirementIds: ["A11Y.SELECT.NATIVE", "EVENT.CONTROL.INPUT"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["errorMessage", "options", "value"]
  }),
  [CoreComponentType.Stack]: definition({
    behaviors: ["Preserves authored child order", "Projects token-backed direction and spacing"],
    browserScenarios: [layoutScenario],
    componentType: CoreComponentType.Stack,
    example: node(CoreComponentType.Stack, "fields", { label: "Profile fields" }),
    pattern: ComponentAccessibilityPattern.Group,
    purpose: "Arrange children linearly without changing their authored identity or order.",
    requirementIds: ["A11Y.LAYOUT.DOM_ORDER", "THEME.TOKEN.LAYOUT"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["label"]
  }),
  [CoreComponentType.Stepper]: stepperSidecar,
  [CoreComponentType.Tabs]: tabsSidecar,
  [CoreComponentType.Table]: definition({
    behaviors: ["Uses native table semantics", "Renders scalar cells as escaped text"],
    browserScenarios: ["renders and safely revises a native JSON table"],
    componentType: CoreComponentType.Table,
    example: node(CoreComponentType.Table, "people", {
      caption: "People",
      columns: [{ key: "name", label: "Name" }],
      rows: [{ cells: { name: "Ada" }, id: "ada" }]
    }),
    pattern: ComponentAccessibilityPattern.NativeTable,
    purpose: "Present a bounded non-interactive record collection with native table semantics.",
    requirementIds: ["A11Y.TABLE.NATIVE", "SECURITY.TABLE.ESCAPED_CELLS"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["caption", "columns", "emptyMessage", "rows"]
  }),
  [CoreComponentType.Text]: definition({
    behaviors: ["Renders authored content as text", "Projects token-backed size, tone, and weight"],
    browserScenarios: [contentScenario],
    componentType: CoreComponentType.Text,
    example: node(CoreComponentType.Text, "summary", { content: "Account summary" }),
    pattern: ComponentAccessibilityPattern.StaticText,
    purpose: "Render one escaped paragraph of visible semantic content.",
    requirementIds: ["A11Y.TEXT.NATIVE", "SEMANTICS.VISIBLE_CONTENT"],
    semanticAttachmentPoints: [visibleProperty("content", "content")],
    sensitiveProperties: ["content"]
  }),
  [CoreComponentType.TextArea]: definition({
    behaviors: ["Uses native multiline editing", "Preserves line breaks in canonical values"],
    browserScenarios: [
      "commits multiline text through the unified stream and selectively projects"
    ],
    componentType: CoreComponentType.TextArea,
    example: node(CoreComponentType.TextArea, "biography", { label: "Biography" }),
    pattern: ComponentAccessibilityPattern.NativeTextInput,
    purpose: "Capture one multiline string with labeled validation and selective projection.",
    requirementIds: ["A11Y.TEXT_AREA.NATIVE", "EVENT.CONTROL.INPUT"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["errorMessage", "value"]
  }),
  [CoreComponentType.TextField]: definition({
    behaviors: ["Uses native single-line editing", "Projects accessible validation state"],
    browserScenarios: ["updates the changed control without updating its sibling"],
    componentType: CoreComponentType.TextField,
    example: node(CoreComponentType.TextField, "name", { label: "Name" }),
    pattern: ComponentAccessibilityPattern.NativeTextInput,
    purpose: "Capture one scalar text value with labeled validation and selective projection.",
    requirementIds: ["A11Y.TEXT_FIELD.NATIVE", "EVENT.CONTROL.INPUT"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["errorMessage", "value"]
  }),
  [CoreComponentType.Tooltip]: tooltipSidecar,
  [CoreComponentType.VirtualList]: definition({
    behaviors: ["Renders at most 200 options", "Preserves selection across virtual windows"],
    browserScenarios: ["virtualizes 10,000 options with stable focus and selection"],
    componentType: CoreComponentType.VirtualList,
    example: node(CoreComponentType.VirtualList, "records", {
      label: "Records",
      options: [{ label: "Record one", value: "record-1" }],
      value: "record-1"
    }),
    pattern: ComponentAccessibilityPattern.Listbox,
    purpose: "Navigate and select from a large option collection with a bounded rendered window.",
    requirementIds: ["A11Y.LISTBOX.ROVING_FOCUS", "PERF.VIRTUAL_LIST.BOUNDED_DOM"],
    semanticAttachmentPoints: [],
    sensitiveProperties: ["errorMessage", "options", "value"]
  }),
  [CoreComponentType.Wizard]: wizardSidecar
});

export const componentDefinitionSidecars = sidecars;

export function getComponentDefinitionSidecar(type: CoreComponentType): ComponentDefinitionSidecar {
  return sidecars[type];
}
