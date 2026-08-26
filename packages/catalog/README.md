# `@unislang/unifold-catalog`

Renderer-neutral descriptors for the first Unifold component vocabulary.
Descriptors define finite enum values, safe property bindings, defaults, cross-property constraints,
and custom-element tags. The IR compiler uses them to reject unknown, incorrectly typed, or
internally inconsistent properties, and renderers consume them instead of maintaining their own
component switch statements.

```ts
import {
  CoreComponentType,
  coreCatalog,
  getCoreDescriptor,
  type ChoiceOption
} from "@unislang/unifold-catalog";

const select = getCoreDescriptor(CoreComponentType.Select);
```

`componentDefinitionSidecars` and `getComponentDefinitionSidecar()` publish the reviewed half of a
component definition for every core component. They provide enum-backed status, accessibility
patterns, evidence checks, data classification, behaviors, privacy fields, structured semantic
attachment contracts, complete `UiDocument` examples, and executable-test metadata. Public fields,
attributes, slots, events, CSS parts, and CSS properties are generated from element source instead
of duplicated in these sidecars. See the
[component evidence pipeline](../../docs/components.md#component-definition-evidence-pipeline).

The current catalog describes `Accordion`, `Alert`, `Box`, `Button`, `Checkbox`, `Composition`,
`DataGrid`, `Form`, `Grid`, `Heading`, `Icon`, `Link`, `MultiSelect`, `RadioGroup`, `Select`, `Stack`,
`Text`, `Table`, `TextArea`, `TextField`, and `VirtualList`. Choice options have string `label` and `value` fields plus
an optional boolean `disabled` field. Enum-backed `CatalogConstraintKind` descriptors require
unique option values and selection membership for every choice control. The package has no
registration side effects. See the [component reference](../../docs/components.md) for the
property/value model and current limits.

Table columns and rows use exported `TableColumn`, `TableRow`, and `TableCellValue` contracts. The
`TableData` catalog constraint enforces unique column keys and row IDs plus declared scalar cell
keys after the reusable bounded shape validators run.
DataGrid reuses those shapes and adds exported selection/sort enums, one composite value contract,
and a cross-field state constraint for sortable columns, selected rows, and active sort state.

TextArea wrap behavior is published as `TextAreaWrap`, and its `rows` property uses the reusable
`CatalogPropertyType.PositiveInteger` validator contract.

Layout values are exported as `LayoutAlignment`, `LayoutSpace`, `StackDirection`, and `SurfaceTone`
enums. Grid columns reuse the positive-integer contract.

Content values are exported as `AlertTone`, `HeadingLevel`, `LinkTarget`, `TextSize`, `TextTone`,
and `TextWeight` enums. `CatalogPropertyType.SafeUrl` centralizes the Link protocol allowlist so the
compiler and element share one policy.

`IconName`, `IconSize`, and `IconTone` define the finite portable Icon vocabulary. Icon names are
required and unknown provider names are rejected before render.
