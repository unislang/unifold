# Normalized-store selective-dispatch benchmark

This suite exercises the real normalized store with deterministic 1,000- and 10,000-node graphs.
Twenty percent of nodes have indexed selections. Correctness tests cover one-node edits, one-percent
bulk edits, 100-sibling reorder, and 100-transaction replay while asserting exact candidate,
notification, and changed-node counts.

A public-runtime fixture adds the architecture's combined transaction workload: 100 controls under
ten aggregate groups, one input-triggered synchronous leaf validation, two affected ancestor
validations, and a 20-rule transitive JSON Logic chain in one commit. It asserts the exact 23-node
change set, 21 command events, committed selector revision/value, and zero unrelated notifications.

```sh
pnpm test:performance
pnpm benchmark:selective
```

The benchmark command uses the repository-pinned Vitest and Tinybench versions and writes
`benchmark-results/selective-rendering.json`. The generated report contains raw Vitest statistics,
direct p50/p95/p99 values, forced-GC heap evidence, provisional timing-gate results, and Node,
operating-system, CPU, and memory metadata. The command enforces the architecture's 8 ms p95
combined-transaction, 4 ms p95 rule-incrementality, and 2 ms p95 indexed-selection dispatch-overhead
limits, plus the 8 ms p95 canonical intent-normalization/owning-actor-delivery limit. The canonical
fixture verifies sequence normalization and exactly-once root/actor delivery for commit, submit,
approval, navigation, and error intent categories. The overhead profile alternates transaction
order across 50 paired 10,000-node baseline and 2,000-selection batches, using each five-edit batch
median to subtract the shared immutable-store work without treating an unrelated scheduler pause as
selection cost. Exact 500-node fixtures enforce 50 ms cold and 16 ms cached compilation p95 limits;
a 2,000-node fixture enforces the 200 ms validation/normalization limit. A 500-instance composition
fixture expands to exactly 1,001 nodes; its complete compilation and a revision changing one
instance each enforce a 100 ms p95 limit. A 500-node hierarchical layout fixture additionally gates
the complete schema-validation, typed-variable lowering, IR-compilation, and normalization path at
100 ms p95. Developer results remain
descriptive until repeated on the pinned release runner; deterministic candidate, notification,
aggregate-validation, and changed-node counts remain mandatory everywhere.

An exact collaboration fixture commits 1,000 server-sequenced revisions and then submits a stale,
disjoint proposal across the entire history. Twenty samples require the 1,000-commit batch at or
below 1,000 ms p95 and the 1,000-revision auto-rebase at or below 100 ms p95, while also requiring
exact accepted statuses, revision sequences, rebased state, and final document values.

An exact devtools fixture captures 10,000 canonical events into a 1,000-entry bounded timeline and
projects 500 normalized nodes with alternating public and restricted classifications. Twenty
samples require timeline capture/filtering at or below 1,000 ms p95 and node picking at or below
100 ms p95, with exact drop/sequence evidence and zero restricted snapshots in the projection.

An exact schema-valid 10,000-option Combobox document alternates twenty broad post-warm-up filters.
Its combined gate requires filter p95 at or below 100 ms and no more than 200 rendered options.
Correctness coverage requires the full 10,000-option accessibility set size, distant-result filtering
and keyboard selection, canonical selection state, and query text that remains interaction-local.

An exact 10,000-option JSON document exercises public VirtualList compilation and application
startup for twenty post-warm-up samples. Its combined gate requires p95 at or below 1,000 ms and at
most 200 rendered option rows; correctness coverage also verifies distant-window scrolling,
selection/focus continuity, and keyboard selection through the runtime.

An exact 1,000-row JSON document exercises native Table compilation and application startup for
twenty post-warm-up samples. Its gate requires p95 at or below 1,000 ms and exactly 1,000 rendered
body rows on every sample; correctness and browser coverage verify native table semantics, escaped
cells, last-known-good rejection, identity retention, and recovery.

An exact 1,000-row DataGrid document adds twenty post-warm-up startup, sort, and selection samples.
Its three gates require p95 at or below 1,000, 250, and 100 ms respectively, exact row count, the
expected first sorted row, and the expected canonical selection. The separate
`pnpm benchmark:data-grid-foundation` command compares bounded native and Spectrum candidates and
records why framework-native behavior was selected.

An exact async-store fixture performs 1,000 separately authorized optimistic commits and 1,000
external snapshot projections through a mounted one-control application. Five samples require p95
at or below 2,000 ms and 5,000 ms respectively while proving the advancing revision, exact final
value, exactly 1,000 normalized projection transactions, and zero provider write echoes.

An exact governed-document fixture performs 1,000 signed document loads and 1,000 revoked-key
denials per sample through the public loader. Five samples require p95 at or below 5,000 ms and
1,000 ms respectively while proving exact compilation, issuer/key/hash/receipt evidence, stable
revocation diagnostics, and one metadata-only durable-audit receipt per operation.

An exact content/media fixture mounts 100 `Card`/`Image` pairs and updates all 100 alternative-text
properties across 50 samples. It requires exact host counts and projection p95 at or below 100 ms.

An exact 10,000-row MasterDetail document adds twenty post-warm-up startup and selection samples.
Its gates require startup p95 at or below 1,000 ms, selection p95 at or below 100 ms, no more than
200 rendered master options, the expected canonical selected row, and the matching detail content.
The component reuses the VirtualList windowing and focus behavior rather than introducing a second
large-collection interaction model.

An exact 10,000-result SearchResults document adds twenty post-warm-up startup, query, and selection
samples. Its gates require p95 at or below 1,000, 100, and 100 ms respectively, no more than 200
rendered options, the exact controlled query, and `result-00001` as the canonical selection.

An exact shared workflow document mounts a 100-step Stepper beside a 100-panel Wizard for twenty
post-warm-up samples. Its three gates require startup p95 at or below 1,000 ms, both distant
selection updates at or below 100 ms, no more than 200 combined step buttons, `step-099` in both
controlled values, and exactly one visible Wizard panel.

A separate Happy DOM worker exercises the public application boundary with a schema-valid 500-node
document. Five warm-up cycles exclude bounded registration and renderer caches; twenty measured
mount/revision/dispose cycles then force garbage collection and must retain less than 2% over the
post-warm-up baseline. The report records every post-cycle heap sample alongside retained bytes,
percentage growth, peak heap, and the executable gate result.

The selective topology is one component root, component groups of up to 100 controls, and leaf
controls, with every fifth node selected. Separate 100-control and 10,000-node aggregate graphs use
real Form and Group derivation. The Chromium journey covers exact DOM mutation, identity/focus, and
20 input-to-next-frame samples at 1,000 and 10,000 rendered nodes. The rule-scale fixture compiles
1,000 rules as forty independent chains and proves a root edit reaches exactly 25. See
[`docs/performance.md`](../../docs/performance.md).
