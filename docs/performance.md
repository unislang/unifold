# Performance evidence

Performance is a correctness property and a capacity claim. Unifold therefore separates deterministic
incrementality assertions from machine-sensitive timing gates.

## Selective node-store proof

`tests/performance` builds exact 1,000- and 10,000-node normalized graphs. Twenty percent of the
nodes have declared, node-indexed selections. The deterministic suite covers a one-node edit, a
one-percent bulk edit, a 100-sibling reorder, a zero-selection baseline, and a 100-transaction
replay. A separate 10,000-node Form → Group → Control graph proves that one leaf edit validates only
its group and root form and notifies only those three indexed projections. The suite asserts
candidate selection count, changed-node count, notification count, validation calls, and revision
count rather than inferring incrementality from elapsed time.

The store maintains a node-to-selection dependency index. A transaction recomputes aggregate
controls only for changed nodes and their ancestors, and reconciles validation routes only for
changed error owners. Removed or replaced node lifetimes invalidate only selections that declare
those nodes. Global selectors remain supported, but are deliberately evaluated for every commit.

Run the evidence locally with:

```sh
pnpm test:performance
pnpm benchmark:selective
```

The benchmark writes an ignored, machine-readable
`benchmark-results/selective-rendering.json` artifact containing raw Vitest results, direct
Tinybench p50/p95/p99 summaries, forced-GC heap evidence, and the Node, operating-system, CPU,
memory, and Git-revision metadata available to the runner. An unborn repository records a null Git
revision instead of failing the measurement. The Chromium scale journey writes
`benchmark-results/browser-interaction.json` with 20 input-to-next-frame samples per graph size.

## Current local observation

On 2026-08-25 and 2026-08-26, Node 22.14.0 on Windows x64 with an AMD Ryzen 9 9950X produced these descriptive
results. They are evidence from a developer workstation, not ratified release thresholds.

| Workload                                    |       p50 |       p95 |       p99 |
| ------------------------------------------- | --------: | --------: | --------: |
| 1k one-node edit, 200 indexed selections    |   0.67 ms |   1.10 ms |   1.40 ms |
| 100-control aggregate leaf edit             |   0.51 ms |   0.73 ms |   2.16 ms |
| 100 controls, validation, and 20 rules      |   0.82 ms |   1.35 ms |   2.44 ms |
| 500-node cold document compilation          |   1.25 ms |   1.60 ms |   1.97 ms |
| 500-node cached document compilation        |   1.08 ms |   1.48 ms |   1.71 ms |
| 2k document validation and normalization    |   5.88 ms |   6.30 ms |   6.68 ms |
| 500-instance composition compilation        |   8.20 ms |   9.32 ms |   9.46 ms |
| 500-instance composition revision           |   8.28 ms |   9.02 ms |   9.30 ms |
| 10k one-node edit, no selections            |   9.14 ms |  10.84 ms |  11.04 ms |
| 10k one-node edit, 2,000 indexed selections |   9.80 ms |  12.78 ms |  12.91 ms |
| 10k one-percent bulk edit                   |  11.12 ms |  13.54 ms |  14.55 ms |
| 10k 100-sibling full-document reconcile     | 327.83 ms | 348.72 ms | 353.43 ms |
| 10k replay of 100 transactions              |    0.99 s |    1.04 s |    1.04 s |
| 10k aggregate-heavy leaf edit               |  44.87 ms |  49.31 ms |  64.87 ms |
| 1k rule graph, 25 affected rules            |   0.04 ms |   0.04 ms |   0.05 ms |
| 10k-option Combobox filter                  |   1.42 ms |   2.18 ms |   3.50 ms |
| 10k-option VirtualList startup              |  20.64 ms |  22.68 ms |  29.79 ms |
| 1k-row native Table startup                 |  69.39 ms |  96.47 ms |  96.88 ms |
| 1k-row native DataGrid startup              | 110.97 ms | 138.41 ms | 160.17 ms |
| 1k-row DataGrid sort update                 |  21.50 ms |  24.45 ms |  31.54 ms |
| 1k-row DataGrid selection update            |  18.28 ms |  20.90 ms |  21.32 ms |
| 10k-row MasterDetail startup                |  38.35 ms |  50.81 ms |  60.94 ms |
| 10k-row MasterDetail selection update       |   4.14 ms |   6.22 ms |   7.67 ms |
| 10k-result SearchResults startup            |  41.59 ms |  50.17 ms |  52.28 ms |
| 10k-result SearchResults query update       |   4.48 ms |   5.50 ms |   8.32 ms |
| 10k-result SearchResults selection update   |   4.01 ms |   4.89 ms |   5.16 ms |
| 100-item navigation startup                 |  80.74 ms | 127.78 ms | 128.91 ms |
| 32-position Breadcrumb activation           |   0.39 ms |   0.77 ms |   1.78 ms |
| 100-step Stepper selection                  |   1.97 ms |   4.37 ms |   9.75 ms |
| 100-panel Wizard selection                  |   2.66 ms |   5.33 ms |  15.09 ms |
| 100-panel Tabs selection                    |   1.57 ms |   4.78 ms |   4.89 ms |
| 100-item MenuButton activation              |   1.52 ms |   5.23 ms |   5.32 ms |
| 32-action Popover opening                   |   0.82 ms |   4.43 ms |   5.36 ms |
| 32-action Dialog opening                    |   0.29 ms |   0.45 ms |   0.86 ms |
| 32-file metadata-only selection             |   0.10 ms |   0.23 ms |   4.24 ms |
| 100-Card/100-Image projection               |   0.56 ms |   3.57 ms |   5.90 ms |
| 100-NumberField projection                  |   0.60 ms |   1.85 ms |   6.78 ms |
| 100-SearchField projection                  |   0.60 ms |   1.92 ms |   5.79 ms |
| 100-CheckboxGroup projection                |   0.96 ms |   3.28 ms |   4.38 ms |
| 100-Switch projection                       |   0.52 ms |   1.20 ms |   6.29 ms |
| 10k-entry AuditLog startup                  |  60.67 ms |  68.65 ms |  72.95 ms |
| 10k-entry AuditLog distant scroll           |   0.63 ms |   1.04 ms |   2.90 ms |
| 1k cached data-actor resolutions            |   5.67 ms |   7.39 ms |   7.60 ms |
| 1k-tag data cache invalidation              |   0.28 ms |   0.81 ms |   1.11 ms |
| 1k server-sequenced collaboration commits   |  22.91 ms |  31.61 ms |  39.40 ms |
| 1k-revision disjoint collaboration rebase   |   0.87 ms |   1.28 ms |   1.69 ms |
| 10k-event bounded devtools timeline         |  44.29 ms |  47.33 ms |  55.21 ms |
| 500-node privacy-aware picker               |   0.18 ms |   0.36 ms |   0.46 ms |
| 1k bounded Fetch control-plane reads        |  23.45 ms |  87.75 ms |  87.75 ms |
| 1k-message Fetch realtime resume            |   3.74 ms |   4.53 ms |   4.53 ms |
| 1k SQLite atomic control-plane commits      |  82.16 ms |  94.50 ms |  94.50 ms |
| 1k SQLite outbox lease and acknowledgement  |  14.38 ms |  29.70 ms |  29.70 ms |
| 1k authorized async store commits           |  58.48 ms |  77.20 ms |  77.20 ms |
| 1k mounted external store projections       |  76.00 ms | 107.39 ms | 107.39 ms |
| 1k governed signed document loads           | 194.89 ms | 261.05 ms | 261.05 ms |
| 1k revoked document denials                 |  40.86 ms |  55.18 ms |  55.18 ms |

Five create/edit/dispose cycles of a selection-free 10,000-node store retained 7.41 MiB after forced
garbage collection, below the provisional 64 MiB leak-sentinel ceiling; peak observed heap was
230.14 MiB. A separate public-application lifecycle profile warms bounded registrations and caches
for five cycles, then mounts, revises, and disposes the same schema-valid 500-node application twenty
times. It retained 548,240 bytes, or 1.04% over its forced-GC baseline, below the architecture's
strict 2% limit; peak lifecycle heap was 89.54 MiB. The 10,000-option Combobox filter rendered exactly 200
matching options at its broadest query, meeting its hard DOM ceiling. The 10,000-option VirtualList
startup fixture rendered at most 23 option rows, below its hard 200-row DOM ceiling. The 1,000-row
native Table fixture rendered exactly 1,000 body rows in every sample. A dedicated single-worker Chromium run measured
input-to-next-frame latency at
19.8/28.6/29.6 ms p50/p95/p99 for 1,000 nodes and 50.9/57.6/73.1 ms for 10,000 nodes. These remain
workstation observations, not portable budgets.

The one-node selected case did not add measurable latency over the zero-selection baseline in this
run, while its deterministic candidate count was exactly one. The full-document reorder remains a
known cost because it validates and reconciles all 10,000 supplied definitions; incremental
structural commands remain separate follow-up work.

## Gate status

The Phase 0 10k selective proof is materially implemented: exact wake-up/validation counts, direct
p50/p95/p99, aggregate-heavy scale, a forced-GC leak sentinel, and sampled browser interaction
latency are executable. Chromium also proves exact DOM mutation, host and focused-input identity,
and one committed target ID at 1,000 and 10,000 nodes. The rule-incrementality proof compiles forty
independent 25-rule chains and verifies that one root edit evaluates exactly 25 of 1,000 rules,
emits exactly 25 typed commands, and leaves every unrelated chain unchanged. Its measured 0.04 ms
p95 is below the provisional 4 ms target on the current workstation. The combined public-runtime
fixture proves one commit spans the leaf edit, three synchronous validations (leaf, group, form),
two ancestor aggregates, 20 transitive rule commands, and committed-revision selector delivery.
Its current 1.25 ms p95 is below the provisional 8 ms target. All fifty-five timing and lifecycle limits
are executable benchmark gates and are included with actual/limit/pass fields in the
schema-2.30.0 machine-readable report; the current run passes all 55/55.
The report also contains a 50-sample paired selection-overhead profile. It alternates measurement
order for each update between identical 10,000-node stores with zero and 2,000 indexed selections,
subtracts the paired timings, and takes each sample's five-edit median. This removes shared
transaction work without assigning an unrelated scheduler pause to selection dispatch before
enforcing the provisional 2 ms p95 gate. The paired profile measured 0.06/0.33/0.55 ms
p50/p95/p99, so the unchanged subscription gate
passes on this workstation.

Dialog foundation selection is recorded separately in
`benchmark-results/dialog-foundation.json`. Its 20-sample native/Lion/Spectrum comparison selected
the native platform baseline: native measured 0.19 ms p95 and 347 gzip bytes against executable
100 ms and 4,096-byte limits. Lion measured 1.14 ms p95/26,994 gzip bytes and Spectrum measured
1.16 ms p95/61,330 gzip bytes as descriptive comparison evidence; neither is shipped at runtime.

A separate 500-sample canonical path profile measures validated intent ingress through publication
and owning-actor delivery. It recorded 0.0019/0.0021/0.0046 ms p50/p95/p99 against the provisional
8 ms p95 gate. Its deterministic fixture covers commit, submit, approval, navigation, and error
categories with canonical sequencing, identical public/actor event identities, and duplicate
rejection without redelivery.

Exact schema-valid document fixtures exercise the public composition-expansion and IR compiler
boundary. Cold 500-node preparation measured 1.25/1.60/1.97 ms against the 50 ms p95 limit; a
prewarmed bounded, defensively cloned `UnifoldDocumentCompiler` cache measured 1.08/1.48/1.71 ms
against 16 ms. Full 2,000-node validation and normalization measured 5.88/6.30/6.68 ms against the
200 ms off-interaction-path limit. A schema-valid document with 500 composition instances expands to
exactly 1,001 IR nodes and measured 8.20/9.32/9.46 ms; recompiling a revision that changes exactly
one instance measured 8.28/9.02/9.30 ms. Both enforce 100 ms p95 limits. Because complete revision
compilation remains comfortably within budget, an incremental subtree cache is deliberately deferred
until these gates or representative product traces justify its invalidation complexity. Cache
correctness tests cover isolation, bounded LRU retention, clear, invalid capacity, and non-JSON
collision resistance.

The select-only Combobox fixture compiles and mounts one exact schema-valid 10,000-option document,
then alternates broad post-warm-up filters for twenty samples. It measured 1.42/2.18/3.50 ms
p50/p95/p99 against the 100 ms p95 budget and rendered exactly 200 options against the hard
200-option ceiling. Correctness coverage filters to a distant option, commits it by keyboard through
the canonical runtime, and proves query text does not become canonical state before selection.

The public application startup fixture compiles and mounts one exact schema-valid 10,000-option
`VirtualList` twenty times after warm-up. It measured 20.64/22.68/29.79 ms p50/p95/p99 against the
1,000 ms p95 budget and observed at most 23 rendered option elements against the 200-row ceiling.
Correctness and Chromium journeys also scroll between distant windows, retain viewport focus and
the committed selection, and commit a keyboard selection through the canonical runtime path.

The companion native-collection fixture compiles and mounts one exact schema-valid 1,000-row
`Table` twenty times after warm-up. It measured 69.39/96.47/96.88 ms p50/p95/p99 against the
1,000 ms p95 budget and rendered exactly 1,000 body rows in every sample. Unit plus Chromium/WebKit
journeys verify native caption, column-header, and row-header semantics; escaped hostile content;
last-known-good rejection; retained host identity; and valid-update recovery.

The controlled native-DataGrid fixture mounts, sorts, and selects an exact schema-valid 1,000-row
document twenty times after warm-up. Startup measured 110.97/138.41/160.17 ms against a 1,000 ms
p95 gate, sort updates measured 21.50/24.45/31.54 ms against 250 ms, and selection updates measured
18.28/20.90/21.32 ms against 100 ms. Every sample rendered exactly 1,000 rows, sorted `person-0`
first, and committed that row through the canonical composite value. Chromium/WebKit additionally
prove keyboard focus continuity, native semantics, axe checks, hostile-text escaping, rollback,
recovery, and stable host identity.

The virtualized MasterDetail fixture compiles and mounts an exact schema-valid 10,000-row document
twenty times after warm-up. Startup measured 38.35/50.81/60.94 ms against a 1,000 ms p95 gate, and
selection/detail projection measured 4.14/6.22/7.67 ms against 100 ms. Every sample rendered at
most 23 master options against the hard 200-option ceiling, selected `account-00001`, and projected
its matching detail. Chromium/WebKit additionally prove responsive collapse, keyboard focus,
canonical state, axe checks, hostile-text escaping, rollback, recovery, and stable host identity.

The controlled SearchResults fixture compiles and mounts an exact schema-valid 10,000-result
document twenty times after warm-up. Startup measured 41.59/50.17/52.28 ms against a 1,000 ms p95
gate, query updates measured 4.48/5.50/8.32 ms against 100 ms, and selection updates measured
4.01/4.89/5.16 ms against 100 ms. Every sample rendered at most 15 options against the hard
200-option ceiling, retained query `Grace`, and selected `result-00001`. Chromium/WebKit additionally
prove native search semantics, listbox keyboard focus, polite result-count status, canonical object
state, axe checks, hostile-text escaping, rollback, recovery, and stable host identity.

The exact shared navigation fixture compiles and mounts a 32-position Breadcrumb, 100-step Stepper,
100-panel Wizard, 100-panel Tabs control, 100-item MenuButton, 32-action Popover, and 32-action Dialog
twenty times after warm-up. Startup measured 80.74/127.78/128.91 ms against a 1,000 ms p95 gate.
Breadcrumb, Stepper, Wizard, and Tabs selection measured 0.39/0.77/1.78 ms,
1.97/4.37/9.75 ms, 2.66/5.33/15.09 ms, and 1.57/4.78/4.89 ms respectively. Opening the menu,
invoking `item-099`, closing it, and restoring trigger focus measured 1.52/5.23/5.32 ms. Opening the
Popover, focusing its labeled interactive surface, and retaining all 32 authored child hosts
measured 0.82/4.43/5.36 ms. Opening the Dialog and focusing its dismiss action measured
0.29/0.45/0.86 ms. Every interaction remains below its 100 ms gate. Every sample rendered exactly
468 buttons, selected
`step-099` in the workflow controls and `tab-099` in Tabs, invoked exactly one declared menu item,
restored menu-trigger focus, left the Popover and Dialog open with their required focus, and left
exactly one Wizard panel and one tabpanel visible. Chromium, Firefox, and WebKit add keyboard focus and dismissal,
disabled-item skipping, automatic/manual activation coverage,
canonical state and events, axe, hostile-text escaping, rejection/recovery, and stable identity
evidence.

The FileInput profile selects the maximum 32 accepted files 50 times through the public deferred
Web Component. Opaque metadata normalization, canonical-event creation, exact-ID handle resolution, and Lit
projection measured 0.10/0.24/4.51 ms p50/p95/p99 against a 100 ms p95 gate. Every sample retained
exactly 32 ephemeral handles while the serialized event was scanned to prove that a marker present
only in file bytes never entered canonical JSON state. Names and modification times are excluded
from the portable metadata contract.

The native-form lifecycle profile projects 100 mixed boolean and repeated-string controls through
the generic adapter, materializes 150 successful `FormData` entries, then resets and restores every
control with exact change accounting. Fifty measured samples record 0.20/0.81/4.42 ms p50/p95/p99
against the executable 8 ms p95 transaction gate. A separate 100-item ErrorSummary profile renders
exactly 100 target links in 0.47/1.51/19.63 ms p50/p95/p99 against its 100 ms p95 gate.

The read-only AuditLog fixture compiles and mounts an exact schema-valid 10,000-entry authorized
history twenty times after warm-up. Startup measured 60.67/68.65/72.95 ms against a 1,000 ms p95
gate, and a deterministic distant scroll measured 0.63/1.04/2.90 ms against 100 ms. Every sample
rendered at most 15 entries against the hard 200-entry ceiling and began the distant window at
`event-9896`. Chromium/WebKit additionally prove native list/time semantics, keyboard-scroll focus,
axe checks, hostile-text escaping, precise duplicate-ID rejection, last-known-good rollback,
recovery, and stable host identity.

The framework-neutral data-actor fixture registers one trusted query operation, warms an exact
1,000-key bounded Query Core cache, and resolves the entire set twenty times without another adapter
call. Cached batches measured 5.67/7.39/7.60 ms against a 250 ms p95 gate. Exact tag invalidation
removed all 1,000 entries in 0.28/0.81/1.11 ms against a 100 ms p95 gate. Contract tests separately
cover cursor-key isolation, LRU and retention limits, offline last-known-good reads, cross-context
notification, bounded retry, optimistic rollback, conflicts, cancellation, timeout abort, and stale
completion rejection.

The collaboration fixture creates exactly 1,000 server-sequenced immutable revisions and submits a
disjoint proposal from the original base across the complete history. Twenty samples measured the
commit batch at 22.91/31.61/39.40 ms p50/p95/p99 against a 1,000 ms p95 gate and the stale rebase at
0.87/1.28/1.69 ms against 100 ms. Every sample also proves accepted status, exact final sequence and
document values, and an explicit rebased proposal.

The devtools fixture captures exactly 10,000 canonical facts into a 1,000-entry retained window.
Twenty samples measured capture plus correlation filtering at 44.29/47.33/55.21 ms p50/p95/p99
against a 1,000 ms gate while proving exactly 9,000 drops and retained sequences 9,001 through
10,000. A 500-node picker with alternating public and restricted classifications measured
0.18/0.36/0.46 ms against 100 ms and proved every restricted projection omitted its snapshot.

The wire-level control-plane fixture performs exactly 1,000 authorized document reads through the
standard Fetch client and handler, including bounded request/response JSON processing, trusted
identity lookup, exact-resource authorization, audit append, status agreement, and typed response
decode. Ten samples measured 23.45/87.75/87.75 ms p50/p95/p99 against a 2,000 ms gate and proved all
1,000 results and 1,001 mutation/read audit entries. A separate service instance creates exactly
1,000 tenant-sequenced facts, then resumes the entire contiguous batch through Fetch and the
stateful cursor in 3.74/4.53/4.53 ms against a 500 ms gate, proving sequences 1 through 1,000 and an
exact final cursor with no duplicate advancement.

The database durability fixture creates a fresh in-memory SQLite database per sample and commits
exactly 1,000 distinct tenant documents. Each commit must create the assigned revision, redacted
audit entry, retained realtime fact, and pending outbox row through one database transaction. Five
samples measured 82.16/94.50/94.50 ms p50/p95/p99 against a 2,000 ms gate. It then drains all 1,000
rows in ten bounded lease/acknowledgement batches, proving ordered unique sequences and zero
survivors in 14.38/29.70/29.70 ms against 500 ms. It next exports the same exact 1,000-document
tenant, encrypts it with AES-256-GCM, reads and decrypts the external envelope, and round-trips it
through a disposable SQLite restore. Five samples measured that complete recovery drill at
40.79/44.53/44.53 ms against 2,000 ms while requiring exact integrity and last-known-good evidence.
Separate trigger-injection tests prove failures roll back document and effect state together with
audit, realtime, and outbox rows.

The async store fixture performs 1,000 separately authorized, schema-validated optimistic commits
through one session and measured 58.48/77.20/77.20 ms p50/p95/p99 against a 2,000 ms gate. A mounted
Happy DOM application then accepted 1,000 validated external snapshots in 76.00/107.39/107.39 ms
against 5,000 ms, requiring exactly 1,000 normalized transactions, the exact final value, and zero
provider commit echoes. Unit and Chromium/WebKit journeys additionally cover pre-render atomic
connection, delayed effect settlement, optional first revision, rollback, subscription conflicts,
external projection, and disposal.

The governed document fixture loads the same signed two-node document 1,000 times through the
public provenance policy and measured 194.89/261.05/261.05 ms p50/p95/p99 against a 5,000 ms gate.
It then rejects the same envelope 1,000 times with a revoked trusted key in
40.86/55.18/55.18 ms against a 1,000 ms gate. Five samples require exact prepared node counts,
issuer/key/hash/receipt evidence, stable revocation diagnostics, and exactly one metadata-only audit
receipt per operation; those correctness conditions are part of each executable gate.

Ratification still requires a provisioned, versioned mid-tier runner. Developer-workstation timing
remains descriptive even though benchmark execution now rejects any provisional p95 limit or the
2% lifecycle-growth limit; deterministic store, combined-transaction, rule-incrementality, and
lifecycle assertions plus the 64 MiB allocation-pressure sentinel run as executable checks now.
