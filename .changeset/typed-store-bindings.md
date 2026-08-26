---
"@unislang/unifold-contracts": minor
"@unislang/unifold-events": minor
"@unislang/unifold-ir": minor
"@unislang/unifold-jsonui": minor
"@unislang/unifold-reactivity": patch
"@unislang/unifold-runtime": minor
"@unislang/unifold": minor
---

Add enum-backed store definitions, schema-checked JSON Pointer control bindings, trusted adapter
preflight, initial-value hydration, and redacted post-commit store-write effects while retaining the
normalized runtime graph as the single UI-state authority. Authorize writes against the active
node binding, validate each complete candidate store, reject unsafe pointer and adapter values, and
roll store configuration back with failed application updates.

Add an injected, versioned Web Storage adapter and classification-aware runtime event disclosure.
Public facts may retain snapshots; non-public facts and every store-write fact are metadata-only.
Transaction and form disclosure aggregate the maximum represented classification, exception details
are sanitized, and reconciliation prevents dirty retained values from inheriting a weaker policy.
