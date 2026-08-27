# Layout-oriented JSON authoring

Unifold's public authoring surface is layout-oriented. It preserves the intent of the original
Angular prototype in `scratch/angular-ui`: select a reusable `layoutType`, supply typed `variables`,
and describe nested UI with `type`, `props`, `children`, and named `events`. This profile lowers to
the existing versioned composition and IR contracts; renderers never interpret authoring syntax.

```json
{
  "$schema": "https://schemas.unifold.org/layout-document/1.0/schema.json",
  "schemaVersion": "1.0.0",
  "id": "contact-page",
  "revision": "revision-1",
  "catalog": { "name": "unifold-core", "version": "1.0.0" },
  "layoutType": "form-section",
  "layoutVersion": "1.0.0",
  "variables": {
    "heading": "Contact form",
    "fields": [
      {
        "id": "name",
        "type": "TextField",
        "props": { "label": "Name", "required": true },
        "events": { "onInput": "FORM_FIELD_CHANGE" }
      }
    ]
  },
  "controls": {
    "contractVersion": "1.0.0",
    "nodes": [
      { "id": "root", "kind": "form" },
      { "id": "name", "kind": "control", "parentId": "root", "key": "name" }
    ]
  },
  "layouts": [
    {
      "layoutType": "form-section",
      "version": "1.0.0",
      "variables": {
        "heading": { "type": "string", "required": true },
        "fields": { "type": "nodes", "required": true }
      },
      "template": {
        "id": "root",
        "type": "Form",
        "props": { "label": { "$var": "heading" } },
        "children": { "$var": "fields" }
      }
    }
  ]
}
```

## Contract

- `layoutType` plus exact `layoutVersion` selects one local or trusted module-provided definition.
  There is no implicit latest version and no request-time URL lookup.
- Variable definitions are exact and typed. Missing required, unknown, incorrectly typed, unsafe,
  or over-budget values fail before a component is created. Defaults are cloned, not shared.
- A node has an explicit stable `id`, catalog `type`, exact `props`, optional `children`, and optional
  `events`. Lowering produces ordinary `$comp`/`$children` nodes and then uses the normal catalog,
  composition, JsonUI-profile, and IR validation boundary.
- Optional `controls` declares logical form ownership independently from visual nesting. Its closed,
  versioned nodes use the enum kinds `form`, `group`, `array`, `record`, and `control`. A non-root
  node names an aggregate `parentId` and a durable sibling-unique `key`; every target must be a
  compatible visual node. Unknown fields, versions, targets, duplicate IDs/keys, cycles, incompatible
  kinds, incomplete coverage, and more than 10,000 nodes reject with exact source pointers.
- `{ "$var": "name" }` is the canonical typed reference. The bounded compatibility grammar also
  recognizes an exact `{{name}}` or `{{item.property}}` reference without `eval`; mixed executable
  expressions, prototype keys, calls, operators, and unresolved paths are rejected.
- Repeated nodes require a declared durable key. Generated IDs use the existing reversible identity
  codec so reorder does not replace controls or focus. Conditions accept booleans only.
- Event keys are catalog-reviewed aliases such as `onClick`, `onInput`, `onBlur`, `onSubmit`, and
  `onReset`. Values are bounded registered machine-event names. The runtime translates an accepted
  canonical source event only for the owning XState actor; it does not execute JSON, expose an event
  emitter, or create a second public event stream.
- XState commands remain trusted names registered by host code. Variables, props, event names, and
  machine definitions cannot contain functions, scripts, provider credentials, or arbitrary URLs.

## Trusted external definitions

Applications may keep reusable layout definitions in reviewed modules instead of copying them into
every authored document. The host creates one immutable registry snapshot and passes it through the
same preparation or mount options used for the document:

```ts
import { createTrustedLayoutDefinitionRegistry, mountUnifoldApplication } from "@unislang/unifold";
import layoutDefinitions from "./layouts.json" with { type: "json" };

const layoutRegistry = createTrustedLayoutDefinitionRegistry(layoutDefinitions);
const result = mountUnifoldApplication(authoredDocument, container, { layoutRegistry });
```

The registry is a host capability, not a document field. It snapshots at most 256 JSON definitions,
performs no fetch, module import, callback, or latest-version resolution, and is reused for mounted
updates and async mounts. Selection still requires one exact `layoutType@layoutVersion`; a duplicate
across local and external definitions rejects. Registry-originated diagnostics use the virtual JSON
Pointer `/$layoutRegistry/definitions/{index}` while authored variables retain their original
`/variables/...` pointers. Construct registries only from reviewed application modules; untrusted
documents cannot nominate a registry or URL.

## Lowering and ownership

```text
layout document -> layout validation/expansion -> composed UiDocument -> IR -> runtime -> renderer
```

The authored layout is retained for editing and deterministic regeneration. The expanded document
is an implementation artifact. Committed values remain in the normalized runtime graph; XState
owns temporal behavior; `runtime.events$` and its indexed views remain the single observable fact
fabric. Layout variables are initialization and structural inputs, not a competing mutable store.

The compiler preserves visual `parentId`/`scopePath` separately from logical `controlParentId`,
`controlChildIds`, and `controlKey`. Aggregate values therefore survive wrapper or composition
reparenting. Trusted commands insert, move, and remove collection members by durable key, and
`runtime.control<T>(id)` exposes live typed value/raw-value/status/error selectors plus transactional
`setValue`, `markTouched`, `setDisabled`, and `reset` operations. The handle is a facade over the
single normalized store, not another forms model.

## Acceptance gates

The profile is not complete until executable evidence proves:

1. exact layout/version selection, defaults, typed variables, nested children, conditionals,
   keyed repetition, and deterministic lowering;
2. catalog property validation and precise source-pointer diagnostics through lowering;
3. named event translation into the correct scope-owned XState actor and trusted command, with the
   original canonical event preserved on `runtime.events$`;
4. observable committed-state projection without duplicate authorities or whole-tree rerenders;
5. rejection and last-known-good recovery for unknown layouts/types/props/events, missing or unsafe
   references, duplicate keys/IDs, malformed loops, oversized input, and executable-looking data;
6. Chromium and WebKit interaction/accessibility journeys, static export where applicable, and a
   repeatable representative layout expansion p95 gate.

The scratch Angular project is a requirements reference, not production code. Its `any` values,
unchecked interpolation, `innerHTML` fallback, runtime asset fetch, timestamp/random identity, and
silent unknown-component behavior are intentionally excluded.
