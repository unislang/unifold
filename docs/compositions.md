# Reusable JSON compositions

`@unislang/unifold-compositions` is the authoring layer for reusable LEGO-like UI structures. It expands composition instances into the ordinary JSON UI document consumed by `@unislang/unifold-ir`; the renderer and runtime never need a second composition-specific state model.

## Authored and expanded JSON

An authored document may declare versioned composition definitions next to its `view`. A definition contains scalar parameters, named slots, a template, and exported local node aliases. An instance selects an exact definition version and supplies parameter and slot values.

```json
{
  "compositions": [
    {
      "contractVersion": "1.0.0",
      "name": "LabeledAction",
      "version": "1.0.0",
      "parameters": {
        "label": { "type": "string", "required": true }
      },
      "slots": [{ "name": "actions", "required": true, "multiple": false }],
      "template": {
        "$comp": "Composition",
        "id": "root",
        "$children": [
          {
            "$comp": "TextField",
            "id": "field",
            "label": { "$parameter": "label" }
          },
          { "$slot": "actions" }
        ]
      },
      "exports": {
        "fieldValue": {
          "kind": "selection",
          "localId": "field",
          "selection": "control-value"
        },
        "setField": {
          "kind": "command",
          "localId": "field",
          "commandType": "control.set-value"
        }
      }
    }
  ],
  "view": {
    "$compose": "LabeledAction",
    "$version": "1.0.0",
    "id": "customer-editor",
    "parameters": { "label": "Customer name" },
    "slots": {
      "actions": [{ "$comp": "Button", "id": "save", "label": "Save" }]
    }
  }
}
```

Call `expandComposedUiDocument(authored)` before `compileUiDocument`. Successful expansion removes the definition table and produces a normal JSON UI tree. In the example, the expanded IDs are:

- `customer-editor` for the template root;
- `customer-editor::field` for the internal control;
- `customer-editor::slot:actions::save` for the supplied slot node.

These IDs are executable identities used by IR, state, events, selectors, and diagnostics. They are
not the public integration boundary. Successful expansion adds a versioned `compositionManifest`
to the ordinary UI document. It records each instance, resolved typed export, and the authored
provenance of every expanded node. The IR validates and preserves that manifest. Authored identity
segments use canonical URI-component encoding (`%` becomes `%25` and `:` becomes `%3A`) before
segments are joined by `::`. URI-unreserved IDs retain their prior readable shape, while IDs such as
`profile:editor` and `name%field` expand without collision and decode exactly.

Use `runtime.composition("customer-editor")` to integrate through stable aliases. `selection` reads a
typed selection export, `exportedEvents` filters an event export, and `command` resolves a command
target. Each view uses the same store and immutable event objects as the root runtime; exports do not
create duplicate state or streams. `exportsByInstanceId` remains a compatibility sidecar for the
experimental expansion API, but new consumers should use the manifest-backed runtime handle.

## Contract rules

- `$version` is an exact version pin. There is no implicit latest version or semantic-version range resolution.
- Parameter references are structural objects such as `{ "$parameter": "label" }`, never executable expressions. Version 1 accepts boolean, number, and string parameters.
- Every supplied slot must be declared. Required, single-node, and multi-node cardinality is checked before compilation.
- Nested compositions are expanded recursively. Missing definitions, cycles, excessive depth, duplicate definitions, duplicate expanded IDs, unknown exports, and invalid parameters or slots produce diagnostics.
- Authored definitions are data only. They cannot contain callbacks, scripts, provider credentials, or effects.
- Export kinds and selection kinds use shared enums in TypeScript. JSON uses their serialized enum
  values. Selection, event, and command exports are validated against the referenced local node.
- The expanded document still passes through the normal JSON UI and catalog validation boundary.
- Each expanded node retains definition, instance, local-ID, ancestry, source-pointer, and optional
  slot provenance through IR and runtime snapshots.

## Version migrations

Hosts opt into every definition change with an exact reviewed edge. Mappings name public exports,
not generated node IDs:

```ts
import { UiCompositionUnmappedMigration, mountUnifoldApplication } from "@unislang/unifold";

mountUnifoldApplication(source, container, {
  compositionMigrations: [
    {
      from: { name: "ProfileEditor", version: "1.0.0" },
      preserve: [{ source: "name", target: "fullName" }],
      to: { name: "ProfileEditor", version: "2.0.0" },
      unmapped: UiCompositionUnmappedMigration.Reset
    }
  ]
});
```

Every changed instance resets to the successor's authored defaults unless a public export is
explicitly preserved. A preserved source and target must resolve to nodes with the same IR kind and
component type; compatible dirty state and focus then follow the export rename. Missing, duplicate,
cyclic, malformed, reused, unknown, or incompatible edges reject before the candidate mutates the
application. Registries and preserved-export lists are each bounded at 128 entries. A failed update
restores exact prior runtime snapshots and authored state; if compensation itself fails, the
application is disposed and quarantined instead of accepting another write against uncertain state.

## Current experimental limitations

The composition contract is a Phase 0 feasibility slice and packages remain private. Definitions are
local to one authored document, versions are selected exactly, and parameters are scalar. The
application coordinator recompiles the complete candidate document before atomically reconciling
the changed graph; incremental subtree compilation and an authored structural-diff wire format are
not implemented because the current measured 500-instance complete and one-instance-revision paths
are both below 10 ms p95 on the recorded workstation; the repeatable 100 ms gates will identify when
that decision must be revisited. The readable `::` namespace is deterministic and collision-safe through the
manifest-declared `1.0.0` identity codec. A one-to-one alias map migrates compatible dirty control
state and focus from IDs produced by the pre-codec implementation; ambiguous aliases are omitted by
the legacy grammar, while IR and runtime still reject malformed or reused aliases rather than
guessing.

Do not treat the expanded document as the editable source. Store and export authored JSON, then
regenerate expanded JSON deterministically. Provenance supports diagnostics and stable public
exports; it does not make generated node IDs a supported external API.

## Completed P0 hardening

- IR and snapshots preserve definition, instance, local-ID, source-pointer, ancestry, and slot
  provenance for every expanded node.
- Exports are typed as selection, event, or command descriptors and resolve through instance
  manifests and `runtime.composition(instanceId)`.
- Schema.org control-value bindings can target a typed composition selection export, so internal
  local IDs can change without changing the semantic authoring contract.
- Revised authored JSON is re-expanded, preflighted, and applied through one atomic graph command.
  Compatible dirty control state, unaffected DOM identity, focus, live selections, composition
  handles, and actor lifetimes are preserved; rejected revisions retain the last-known-good state.
- Authored IDs no longer reserve `::`, `:`, or `%`. Canonical reversible segment encoding is
  versioned in the composition manifest, exports and provenance retain authored local IDs, and
  exact legacy aliases preserve compatible dirty/focused state during the one-time identity move.
- Exact host-reviewed definition-version edges reset unmapped state and preserve only compatible
  mapped exports. Missing or invalid edges retain last-known-good state, rollback uses exact prior
  snapshots, and failed compensation quarantines the application.
- Complete 500-instance composition compilation and a revision changing one instance have separate
  correctness fixtures and executable 100 ms p95 regression gates. The schema-2.17.0 report records
  9.89 ms and 9.70 ms p95 respectively, so subtree-cache complexity is not currently justified.
- The built reference application exercises reviewed preservation, reset-by-default, unreviewed
  rejection and recovery, renamed-export focus/state/semantics, unaffected sibling DOM identity,
  canonical event provenance, and axe checks in Chromium, Firefox, and WebKit.

## P0 hardening follow-ups

Before compositions become a stable authoring or AI-editing boundary, complete these P0 items:

1. Route AI-authored changes through schema-validated typed operations with policy checks, preview transactions, approval boundaries, undo, audit provenance, deterministic replay, and export from committed authored state.
2. Keep the now-passing Chromium/Firefox/WebKit migration journey as a release gate. Retain the
   complete-compilation gates and introduce subtree compilation only if representative measurements
   exceed their budgets.

Each item needs positive, negative, lifecycle, accessibility, event-identity, and browser coverage before the composition contract is declared stable.
