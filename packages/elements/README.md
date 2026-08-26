# `@unislang/unifold-elements`

Accessible Lit-based Web Components for the Unifold core catalog. Importing
the package has no registration side effect:

```ts
import { ElementRegistrationStatus, defineUnifoldElements } from "@unislang/unifold-elements";

const result = defineUnifoldElements();
if (result.status === ElementRegistrationStatus.Rejected) {
  console.error(result.diagnostics);
}
```

`defineUnifoldElements()` preflights the entire native registry before defining accordion, alert,
box, button, checkbox, composition, data-grid, form, grid, heading, icon, link, master-detail,
multi-select, radio-group, search-results, select, stack, stepper, table, text, text-area, text-field,
virtual-list, and wizard. Repeated calls and duplicate copies of the exact core
catalog release are idempotent. Foreign, differently versioned, malformed, or incorrectly tagged
definitions return enum-backed diagnostics without defining any missing tags. An unexpected native
definition failure reports the tags already defined because the platform registry cannot roll back.
Use an iframe or another document realm for incompatible catalog releases. The shared constructor
marker coordinates trusted same-realm packages; it is not a security boundary.

The clean packed-consumer test expands the published artifact into two physical directories and
proves that their distinct constructors remain compatible over a deduplicated Lit runtime. It also
injects different-release metadata into an iframe registry and verifies all-tag preflight prevents
partial definition.

`registerCoreElements()` remains as a deprecated compatibility alias. Each class is also exported
for advanced hosts. Choice, text-input, disclosure, heading, and link components use native HTML
foundations; layout and content primitives use slots and theme tokens.

`unifold-icon` maps a small enum-backed registry to tree-shaken `@lucide/icons` data and its official
DOM builder. It performs no runtime fetch. Labeled icons expose `role="img"`; unlabeled icons are
decorative and hidden from the accessibility tree. See the [OSS decision](../../docs/oss-decisions.md).

Every user interaction dispatches a bubbling, composed `unifold-event` whose `detail` is a `UiEvent`
envelope. This event is trusted transient ingress within a mounted application: its change and
snapshot may include the current interaction value, component properties, and host attributes so the
coordinator can derive a command. Do not forward it to logging, telemetry, or another trust boundary.
The classification-aware `runtime.events$` projection is the public-safe canonical stream. See
[runtime event disclosure](../../docs/event-disclosure.md). Hosts also expose
`data-unifold-render-count` as a stable diagnostic used to verify selective updates.

Controls emit interaction intents; the normalized runtime remains the committed value authority and
projects accepted values back to the element. See the [component reference](../../docs/components.md)
for JSON examples, value types, and the current accessibility boundary.

## Component manifests

`pnpm generate:cem` analyzes all twenty-six core elements with the official Custom Elements Manifest
analyzer and Lit plugin. It validates the output against the official manifest schema and writes
`dist/custom-elements.json`. The package exposes that file through its standard `customElements`
metadata and `./custom-elements.json` export.

The same build joins generated element facts to catalog descriptors and reviewed sidecars, then
writes `dist/component-definitions.json`. Each definition includes authoring, attribute, public
snapshot, and optional control-value schemas plus enum-backed capabilities, semantics,
accessibility, privacy, examples, and executable evidence. Root tests reject schema, catalog,
sidecar, registration, snapshot, or evidence drift. The analyzer, schema package, and Ajv are
development-only; they add no browser runtime dependency. See the
[component evidence pipeline](../../docs/components.md#component-definition-evidence-pipeline).
