# Core components

The implemented core catalog contains thirty JSON-constructible Web Components. Every component has a
stable node ID, participates in the same canonical event stream, and receives selective state
projection through the application runtime. The catalog descriptor is the authority for accepted
properties; the IR compiler rejects unknown properties and values of the wrong type before render.

| JSON `$comp`    | Custom element           | Value          | Native foundation         | Canonical interaction                  |
| --------------- | ------------------------ | -------------- | ------------------------- | -------------------------------------- |
| `Accordion`     | `unifold-accordion`      | boolean        | `details` and `summary`   | `control.input`                        |
| `Alert`         | `unifold-alert`          | none           | ARIA live region          | none                                   |
| `AuditLog`      | `unifold-audit-log`      | none           | section + list + time     | none                                   |
| `Box`           | `unifold-box`            | none           | slotted container         | descendant scope                       |
| `Button`        | `unifold-button`         | none           | `button`                  | `component.activated`                  |
| `Checkbox`      | `unifold-checkbox`       | boolean        | checkbox input            | `control.input`, `control.blurred`     |
| `Combobox`      | `unifold-combobox`       | string         | input + ARIA listbox      | `control.input`, `control.blurred`     |
| `Composition`   | `unifold-composition`    | none           | grouping host             | descendant scope                       |
| `DataGrid`      | `unifold-data-grid`      | object         | table and native inputs   | `control.input`, `control.blurred`     |
| `Form`          | `unifold-form`           | derived object | `form`                    | `form.submit-requested`                |
| `Grid`          | `unifold-grid`           | none           | slotted grid container    | descendant scope                       |
| `Heading`       | `unifold-heading`        | none           | native `h1`–`h6`          | none                                   |
| `Icon`          | `unifold-icon`           | none           | inline SVG                | none                                   |
| `Link`          | `unifold-link`           | none           | anchor                    | `component.activated`                  |
| `MasterDetail`  | `unifold-master-detail`  | string         | virtual listbox + region  | `control.input`, `control.blurred`     |
| `MenuButton`    | `unifold-menu-button`    | none           | button + ARIA menu        | `component.activated`                  |
| `MultiSelect`   | `unifold-multi-select`   | string array   | multiple select           | `control.input`, `control.blurred`     |
| `RadioGroup`    | `unifold-radio-group`    | string         | fieldset and radio input  | `control.input`, `control.blurred`     |
| `SearchResults` | `unifold-search-results` | object         | search input + listbox    | `control.input`, `control.blurred`     |
| `Select`        | `unifold-select`         | string         | select                    | `control.input`, `control.blurred`     |
| `Stack`         | `unifold-stack`          | none           | slotted flex container    | descendant scope                       |
| `Stepper`       | `unifold-stepper`        | string         | navigation + buttons      | `control.input`, `control.blurred`     |
| `Tabs`          | `unifold-tabs`           | string         | ARIA tabs + stable panels | `control.input`, `control.blurred`     |
| `Table`         | `unifold-table`          | none           | native table              | none                                   |
| `Text`          | `unifold-text`           | none           | paragraph                 | none                                   |
| `TextArea`      | `unifold-text-area`      | string         | textarea                  | `control.input`, `control.blurred`     |
| `TextField`     | `unifold-text-field`     | string         | typed input               | `control.input`, `control.blurred`     |
| `Tooltip`       | `unifold-tooltip`        | none           | button + Popover API      | none                                   |
| `VirtualList`   | `unifold-virtual-list`   | string         | ARIA listbox              | `control.input`, `control.blurred`     |
| `Wizard`        | `unifold-wizard`         | string         | navigation + region       | `control.input`, `component.activated` |

Event names above use their readable suffixes. The wire values are versioned enums such as
`org.unifold.ui.control.input.v1`, exported as `ElementEventType`.

The baseline registration includes the nineteen small families. AuditLog, Combobox, DataGrid,
MasterDetail, MenuButton, SearchResults, Stepper, Tabs, Tooltip, VirtualList, and Wizard are deferred
families loaded through matching `@unislang/unifold/<kebab-case-name>` subpaths before mounting JSON
that references them. Every subpath exports a `defineUnifold*()` registration function and the
element class. The split is a delivery boundary only: descriptors, IR validation, snapshots,
events, static rendering, and accessibility requirements remain catalog-authoritative.

## Choice-control example

```json
{
  "$comp": "Select",
  "id": "country",
  "label": "Country",
  "name": "country",
  "options": [
    { "label": "United States", "value": "us" },
    { "label": "Canada", "value": "ca", "disabled": true }
  ],
  "required": true,
  "value": "us"
}
```

`Tabs` uses the same bounded exact item shape through its `tabs` property and requires exactly one
authored child panel per item. Its controlled string `value` must name an enabled tab. Horizontal
and vertical arrow keys wrap through enabled tabs; Home and End move to the first and last enabled
tab. `activationMode` is `automatic` by default or `manual` when selection should wait for Enter or
Space. The element exposes a labeled tablist, roving-focus tabs, and stable labeled tabpanels while
retaining every authored child DOM identity. Static export preserves the public selected ID in a
validated hydration marker and renders all escaped panels with only the selected panel visible.

```json
{
  "$comp": "Tabs",
  "id": "account-tabs",
  "label": "Account sections",
  "tabs": [
    { "id": "summary", "label": "Summary" },
    { "id": "activity", "label": "Activity" }
  ],
  "value": "summary",
  "$children": [
    { "$comp": "Text", "id": "summary-panel", "content": "Summary" },
    { "$comp": "Text", "id": "activity-panel", "content": "Activity" }
  ]
}
```

`MenuButton` accepts 1 to 100 exact `{ "label", "value", "disabled"? }` action items. Values are
unique registered action identifiers, not executable code. Its open state and roving-focus position
remain interaction-local; selecting an enabled item emits one `component.activated` intent with
`{ "itemId": value }` and does not create competing runtime state. Arrow Up/Down wrap across
enabled items, Home/End reach boundaries, Escape closes and returns focus, Tab closes without
trapping focus, and pointer dismissal closes without moving focus. The trigger exposes
`aria-haspopup="menu"` and exact expanded/controls relationships; the popup uses labeled
menu/menuitem semantics. Static export degrades to native `details`/`summary` with escaped action
buttons.

```json
{
  "$comp": "MenuButton",
  "id": "account-actions",
  "label": "Account actions",
  "items": [
    { "label": "Edit account", "value": "edit" },
    { "label": "Archive account", "value": "archive" }
  ]
}
```

`Tooltip` accepts required `label` and `content` strings plus a logical `placement` of `top`,
`bottom`, `start`, or `end`. It is a leaf component: authored children are rejected. Focus or
pointer hover opens the non-interactive `role="tooltip"` surface, Escape and outside pointer input
dismiss it, and focus remains on the labeled trigger. The browser element uses the native Popover
API when available with a deterministic fixed-position fallback; static export emits escaped
`aria-describedby` help text. Tooltip belongs to a deferred family and must be loaded before a
document that references it is mounted:

```ts
const { defineUnifoldTooltip } = await import("@unislang/unifold/tooltip");
defineUnifoldTooltip();
```

```json
{
  "$comp": "Tooltip",
  "id": "shipping-help",
  "label": "Shipping information",
  "content": "Delivery excludes holidays.",
  "placement": "top"
}
```

`DataGrid` reuses the same bounded column, row, identifier, scalar-cell, and escaped-text contract
as `Table`, then adds controlled sorting and selection. `sortableColumns` must contain unique,
declared column keys. `selectionMode` is `none`, `single`, or `multiple`. Its single canonical value
contains `selectedRowIds` and an optional `{ "key", "direction" }` sort, where direction is
`ascending` or `descending`. The compiler rejects duplicate or unknown selections, selection counts
that violate the mode, undeclared sortable keys, and active sorts on non-sortable columns at exact
JSON Pointers. Native buttons, radios, and checkboxes emit the complete value; the runtime remains
the only committed state authority. Static export preserves public sort/selection state as disabled
native controls and emits an empty shell for classified data.

```json
{
  "$comp": "DataGrid",
  "id": "people-grid",
  "caption": "People",
  "columns": [
    { "key": "name", "label": "Name" },
    { "key": "age", "label": "Age" }
  ],
  "rows": [{ "id": "ada", "cells": { "name": "Ada", "age": 37 } }],
  "sortableColumns": ["name", "age"],
  "selectionMode": "multiple",
  "value": {
    "selectedRowIds": ["ada"],
    "sort": { "key": "name", "direction": "ascending" }
  }
}
```

`Select`, `RadioGroup`, and `Combobox` accept string values. `MultiSelect` uses the same option shape
and accepts an array of strings. Every option value must be unique, and every non-empty selection
must match a declared option value. The compiler reports duplicate and unknown selections at their
exact JSON Pointer and does not produce partial IR. An empty scalar value represents no selection.
The select-only `Combobox` filters its bounded options without committing the query: Arrow keys move
its active descendant, Enter or pointer selection commits a registered value, Escape restores the
committed label, and deleting all text emits an explicit clear intent. Its popup query, visibility,
and active descendant remain interaction-local rather than forming a second application store. A
broad query renders at most 200 results while exposing the complete match count with ARIA set-size
metadata; users filter to reach later registered options without creating an unbounded DOM.
RadioGroup uses native fieldset, legend, and same-name radio semantics. `Checkbox` and `Accordion`
accept booleans. A user interaction emits an intent; the runtime commits the authoritative value and
projects it back to the element.

`VirtualList` accepts the same unique `{ "label", "value", "disabled" }` option contract as
`Select`, plus positive integer `itemHeight`, `overscan`, and `viewportHeight` properties. It keeps
the full validated collection in normalized state but renders only the visible, overscanned window,
with a hard ceiling of 200 option elements. The listbox retains its focused viewport and committed
selection as its window changes. Arrow keys move the active descendant, while Enter or Space emits
the canonical selection intent. Its deterministic 10,000-option browser and benchmark fixtures
verify the bounded DOM, selection/focus continuity, and startup budget.

`MasterDetail` reuses that bounded listbox interaction model over the same strict column and row
shape as `Table`. `masterColumn` must name a declared column, and the scalar `value` must be empty or
match a declared row ID. The selected row is exposed in a labeled detail region as an escaped
definition list. `itemHeight`, `overscan`, and `viewportHeight` control the master window, which is
hard-capped at 200 rendered options even for 10,000 records. A container query collapses the
two-pane layout to one column without replacing the focused listbox or losing selection. Public
static output retains a bounded master list plus the selected detail; classified bindings emit an
empty data shell.

```json
{
  "$comp": "MasterDetail",
  "id": "accounts",
  "label": "Accounts",
  "columns": [
    { "key": "name", "label": "Name" },
    { "key": "status", "label": "Status" }
  ],
  "rows": [{ "id": "ada", "cells": { "name": "Ada", "status": "Active" } }],
  "masterColumn": "name",
  "detailLabel": "Account details",
  "value": "ada"
}
```

`SearchResults` combines a native labeled search input with a virtualized result listbox. Its
controlled value is `{ "query", "selectedResultId" }`; every query or selection intent emits the
complete object. `results` accepts at most 10,000 exact objects with a unique safe `id`, a non-empty
`title`, and optional bounded `description` and safe `href`. The compiler rejects unknown selected
IDs, duplicate IDs, executable URLs, oversized strings, and extra result fields before rendering.
The listbox renders at most 200 options, exposes `aria-setsize`/`aria-posinset`, preserves active
identity across valid revisions, and announces loading or exact result count through a polite status
region. Public static output emits a bounded semantic link list plus a distant selection; classified
bindings emit an empty search shell.

```json
{
  "$comp": "SearchResults",
  "id": "customer-search",
  "label": "Search customers",
  "resultsLabel": "Customer results",
  "results": [{ "id": "ada", "title": "Ada", "description": "Active", "href": "/customers/ada" }],
  "value": { "query": "Ada", "selectedResultId": "ada" }
}
```

`AuditLog` presents an authorized read-only history in authored order. `entries` accepts up to
10,000 exact objects with unique safe `id` values, RFC 3339 `timestamp` values, non-empty bounded
`actor`, `action`, and `summary` text, and an optional safe `correlationId`. The compiler rejects
duplicates, malformed timestamps, extra fields, unsafe identifiers, and oversized text before
rendering. The component uses a named section, ordered list, and native `time` elements; it does not
use the ARIA live-log role because historical entries must not all be announced when mounted. Its
virtual window exposes collection positions and never renders more than 200 entries. Every field is
text-only. Static export includes the complete authorized history and emits an empty shell for a
classified source.

The browser component is only a presentation of server-authorized records. Runtime events,
telemetry, or client-side state are not a durable or legally authoritative audit record; collection,
retention, access control, and evidence export remain responsibilities of the append-only server
audit system.

```json
{
  "$comp": "AuditLog",
  "id": "account-audit",
  "label": "Account history",
  "entries": [
    {
      "id": "event-1",
      "timestamp": "2026-08-25T12:34:56Z",
      "actor": "Ada Lovelace",
      "action": "updated",
      "summary": "Changed account status",
      "correlationId": "request-1"
    }
  ]
}
```

`Stepper` and `Wizard` share a controlled current-step ID and an ordered `steps` list containing 1
to 100 exact `{ "id", "label", "description"?, "disabled"? }` objects. IDs are unique safe
identifiers; the current value must name a declared enabled step. Stepper is a leaf navigation
landmark with roving keyboard focus, arrow/Home/End movement, and one `aria-current="step"` item.
Wizard requires exactly one authored `$children` panel per step, preserves every child identity,
hides and makes inactive all non-current panels, and labels the current region from its step. Linear
mode prevents forward jumps while Back and Next skip disabled steps; the final action emits an
explicit `{ "action": "complete", "value": stepId }` activation intent. The compiler rejects extra
Stepper children and mismatched Wizard panels before rendering. Public static output retains every
panel for deterministic upgrade with only the selected panel visible; classified navigation emits
an empty label-and-step shell.

```json
{
  "$comp": "Wizard",
  "id": "account-wizard",
  "label": "Create account",
  "steps": [
    { "id": "account", "label": "Account" },
    { "id": "review", "label": "Review" }
  ],
  "value": "account",
  "$children": [
    { "$comp": "Stack", "id": "account-panel" },
    { "$comp": "Stack", "id": "review-panel" }
  ]
}
```

`Table` accepts 1 to 64 exact `{ "key", "label" }` column definitions and up to 10,000 exact
`{ "id", "cells" }` rows. Row IDs and column keys must be unique, non-empty, at most 128
characters, and may not use prototype-sensitive names. Cells may contain only finite numbers,
strings, booleans, or null, and every cell key must name a declared column. The compiler reports
duplicates and undeclared cells at their exact escaped JSON Pointer. The element renders a native
caption, column headers, and first-column row headers; every authored value is escaped text. The
static exporter omits all table metadata and cells when the node is bound to non-public data. The
1,000-row public-application fixture requires every native row and a startup p95 at or below
1,000 ms.

```json
{
  "$comp": "Table",
  "id": "people",
  "caption": "People",
  "columns": [
    { "key": "name", "label": "Name" },
    { "key": "active", "label": "Active" }
  ],
  "rows": [{ "id": "ada", "cells": { "name": "Ada", "active": true } }],
  "emptyMessage": "No people"
}
```

`TextArea` accepts positive integer `rows` and enum-backed `wrap` values (`soft` or `hard`). It emits
the complete string, including line breaks, through the same control event and state path as
`TextField`.

`Box`, `Stack`, and `Grid` are structural LEGO primitives. They preserve each slotted child's node
identity and event path while applying only catalog-approved, token-backed layout values. `Box`
accepts enum-backed `padding` and `surface`; `Stack` accepts `align`, `direction`, and `gap`; `Grid`
accepts a positive integer `columns` and enum-backed `gap`. A non-empty `label` gives the container
an accessible group name. Structural primitives emit no competing control value or interaction
event of their own.

`Text`, `Heading`, and `Alert` render authored strings as text rather than HTML. Their presentation
choices are enum-backed, token-styled catalog values. Heading levels render native `h1` through
`h6` elements. Informational and success alerts use a polite status region; warning and danger
alerts use an assertive alert region. Use urgent tones only for content that genuinely needs
immediate announcement.

`Link` requires a safe `href` and uses the native anchor navigation contract. Relative URLs,
fragments, HTTP(S), `mailto`, and `tel` are accepted; executable and data URLs are rejected before
IR generation and sanitized again by the element. `_self` and `_blank` are enum-backed targets, and
new-context links receive `noopener noreferrer`. Activation emits the same canonical component
intent envelope as other interactive components without converting navigation into control state.

`Icon` uses an enum-backed six-glyph core allowlist sourced from the official, pinned Lucide icon
data package. A non-empty `label` produces an SVG image with that accessible name. An empty label
marks the SVG decorative with `aria-hidden="true"`; icons never receive keyboard focus. Size and
tone use theme enums and tokens. Icon geometry, licensing, fallback, and export obligations are
recorded in the [OSS decision register](./oss-decisions.md).

For TypeScript integrations, use the named runtime vocabularies and option type rather than
redeclaring literal unions:

```ts
import {
  ButtonVariant,
  CoreComponentType,
  type ChoiceOption,
  type MenuItem
} from "@unislang/unifold-catalog";
```

## Component-definition evidence pipeline

All twenty-nine core elements participate in the executable `ComponentDefinition` pipeline. The
elements build runs the official Custom Elements Manifest analyzer with its Lit plugin, validates
the complete result against the official manifest JSON Schema, and writes
`dist/custom-elements.json`. The generated manifest owns facts that can be derived from source:
public fields, attributes, slots, events, CSS parts, and CSS custom properties.

Reviewed, enum-backed sidecars in `@unislang/unifold-catalog` own facts that source analysis cannot
infer reliably: purpose, behavior, release status, accessibility pattern and evidence, privacy
classification, sensitive properties, semantic attachment points, examples, requirement IDs, and
unit/browser evidence. A drift test joins each generated tag to its sidecar, requires the referenced
tests and browser scenarios to exist, and proves every catalog property binding is a public element
field. A live-event test also compares every component's declared property bindings with its public
snapshot. Those checks exposed and corrected omitted validator and update-trigger fields in
canonical component snapshots.

The build joins those sources into `dist/component-definitions.json`, including generated authoring,
attribute, public-snapshot, and optional control-value schemas plus enum-backed common capabilities.
Content components declare structured subject/property contracts with value source, normalization,
and hidden-content policy; layout and control components explicitly declare no semantic attachment.
Both generated artifacts are package exports. All definitions remain `Experimental` until their
full manual accessibility and release evidence is complete; manifest completeness is not itself an
accessibility certification.

## Current boundary

These controls intentionally prefer native browser semantics. They have automated unit and browser
coverage, including keyboard and axe checks, but that is not a complete accessibility certification.
Free-form autocomplete variants, validation projection for every future control, field grouping,
overlays, menu variants, form-associated custom-element behavior,
localization, and the full browser/assistive-technology evidence matrix remain planned work. Do not
infer support for an unregistered component or property from the long-term architecture catalog.

Required/empty runtime validity, touched-only field and form-summary projection, invalid facts,
correction, valid submission, selective updates, and axe checks run in all three reference browsers.
The reference form also submits boolean, string, and string-array values together, omits a disabled
control, then resets visible and aggregate state atomically through the same canonical stream.
