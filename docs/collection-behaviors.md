# Collection behavior contracts

Named Scratch-style repeats keep two deliberately separate forms of collection metadata.

The normalized `UiDocument` publishes only safe executable behavior:

```json
{
  "collectionBehaviors": {
    "contractVersion": "1.0.0",
    "nodes": [
      {
        "collectionId": "items",
        "emptyFocusTargetId": "add-item"
      }
    ]
  }
}
```

Layout authors normally produce this object by placing `collection`, `key`, and
`emptyFocusTarget` on a repeated node. The layout compiler validates the target and emits the
normalized field deterministically. Canonical `UnifoldIr@1.1.0` indexes it as
`collectionBehaviorsById`, and mounted focus selection reads that IR map after a successful
collection reconciliation. It does not infer a fallback merely because a similarly named button
is rendered.

The public contract is closed and bounded. It accepts exactly version `1.0.0`, at most 10,000
unique collection entries, an explicit Array or Record control for each collection, and a distinct
visual target outside that collection's logical control subtree. The target or its visual subtree
must contain an enabled component whose programmatic-focus policy is declared by the core catalog.
Unknown fields, versions, collections, targets, disabled-only targets, and duplicate authorities
fail compilation with exact JSON Pointer diagnostics.

The normalized field intentionally excludes `sourcePointer`, `keyProperty`, and declaration
pointers. Those values remain private to `PreparedUnifoldDocument.collectionsById`, where the
mounted application uses them to revise authored layout variables. This prevents deployment IR and
module artifacts from exposing compiler-internal source authority or accepting it from authored
JSON.

## Module and compatibility boundary

Resolved modules preserve `collectionBehaviors`, the rewritten Scratch-style authored document, and
the exact trusted layout-definition snapshot under one artifact integrity. The
`createUiModuleApplicationInput()` boundary requires the committed lock pin, recomputes that
integrity, returns a defensive authored clone plus trusted registry, and lets ordinary preparation
derive compiler-private mutation pointers again. Module-hosted non-empty repeats therefore preserve
escaped durable-key identity through mounted insert/remove operations without serializing raw
pointers or trusting normalized behavior as write authority. Focused integration evidence covers
keys containing both `/` and `::`.

IR `1.0.0` remains sufficient for existing render-only fixtures. The compiler now emits IR `1.1.0`
because the additive `collectionBehaviorsById` field changes the derived execution artifact. Hosts
should persist authored JSON rather than either IR version and regenerate module IR integrity locks
after upgrading.

## Remaining focus-effect boundary

IR target validation and runtime preflight prove logical availability, not actual browser focus.
The DOM effect still needs a truthful result contract that confirms deepest composed active focus,
rejects CSS-hidden or native focus refusal, crosses shadow-root update ancestors, and reports
pending-definition or user-superseded attempts without publishing a false `EffectCompleted`.
Playwright browser evidence is required because DOM test emulators can focus elements that browsers
refuse to focus.
