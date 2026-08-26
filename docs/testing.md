# Testing Unifold applications

Unifold treats browser verification as a framework capability. `@unislang/unifold-testkit` defines portable scenarios and assertions; `@unislang/unifold-playwright` executes them using Playwright and axe-core rather than duplicating either tool.

## Scenario contract

A `TestScenario` declares environment, semantic actions, an expected `UiEvent` sequence, affected and
unaffected nodes, and automated accessibility expectations. It is data-only so it can be validated,
generated, reviewed, stored, and replayed without executing AI- or user-supplied code. The bundled
Playwright fixture currently observes trusted DOM ingress; runtime disclosure tests subscribe to
`runtime.events$` and its indexed views.

Prefer selectors in this order: role and accessible name, label, stable component ID, visible text, then test ID. Never locate by Tailwind class, shadow-tree depth, or generated markup.

See the runnable [`contact-form` scenario](../examples/test-scenario/src/contact-form.scenario.ts).

## Local commands

```sh
pnpm test
pnpm test:scripts
pnpm test:coverage
pnpm test:performance
pnpm benchmark:selective
pnpm typecheck
pnpm quality
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm test:jsonui-parity
pnpm test:e2e
pnpm test:e2e:host-parity
pnpm test:e2e:reference
pnpm test:e2e:static-export
pnpm test:consumer
```

The reference build sums the gzip size of every emitted JavaScript chunk and fails above 180 KiB;
this keeps the architecture budget executable even if code splitting introduces additional files.

`pnpm test:consumer` is the release-artifact boundary: it installs packed packages outside the
workspace, typechecks and bundles a public-API-only fixture, and runs its lifecycle in Chromium.
See [Packaging and clean-consumer verification](./packaging.md).

The 2026-08-25 local acceptance snapshot runs 302 package test files and 740 tests with zero
failures. V8 coverage records 97.44% lines/statements, 97.37% functions, and 90.40% branches across
package source. The data-source package independently records 94.81% lines, 93.10% functions, and
90.10% branches. Devtools independently records 99.66% lines, 98.88% functions, and 95.26%
branches. These observations supplement, rather than replace, the executable 90% repository coverage
thresholds.

## Test placement

Every source module under `packages/*/src` or `packages/*/scripts` has exactly one colocated test with
the same base name: `src/feature.ts` is tested by `src/feature.test.ts`. This includes public barrels
and declarative contract modules, whose tests verify their import or type contract. Organize a
behavioral module's positive, negative, cancellation, and recovery cases within its single test
file. Explicitly named `*.test-data.*` support modules and declaration-only modules are exempt because
they contain no independently executable behavior.

The `pnpm quality:tests` gate rejects missing, centralized, orphaned, or misnamed package unit tests.
Dedicated suites under `tests/` are reserved for cross-package integration and Playwright E2E
behavior. `pnpm typecheck` compiles both publishable source projects and every colocated test project;
passing Vitest transformation alone is not sufficient.

The gate is aligned to the `.ts` package sources and registered `.mjs` script suites that the test
commands execute. A new module format must extend test discovery and test-project typechecking in the
same change. A new package script suite must also be registered with the root `test:scripts` command.

To inspect one browser interactively:

```sh
pnpm exec playwright test --config tests/e2e/playwright.config.ts --project chromium --ui
```

The reference matrix runs Chromium, Firefox, and WebKit. Keep all three projects in CI because
engine-specific keyboard, shadow-DOM, and accessibility behavior can diverge.
To test an externally managed server, set `PLAYWRIGHT_BASE_URL`; the suite will skip its local
preview lifecycle. Set `PLAYWRIGHT_REFERENCE_PORT` to move the strict, isolated local preview when
the default port is occupied.

The standalone static-export matrix serves the exact deterministic exporter bytes, with the upgrade
bundle as a separate host-loaded asset. It verifies native no-JavaScript content, the integrity
manifest, delayed state/focus migration, atomic JSON-LD ownership, exactly-once canonical events,
and non-mutating structural and ownership rejection. Set `PLAYWRIGHT_STATIC_EXPORT_BASE_URL` for an
external artifact server or `PLAYWRIGHT_STATIC_EXPORT_PORT` to override its strict local port.

The framework-host matrix mounts the identical JSON document and direct Web Component probes from
plain DOM, React, Vue, and Svelte. One shared journey compares property assignment, dashed custom
events, default slots, canonical transaction ordering, runtime-owned values, host identity/focus
across shell rerenders, and teardown. The clean-consumer gate copies that matrix outside the
repository and installs packed Unifold tarballs before repeating it in Chromium. Set
`PLAYWRIGHT_HOST_PARITY_BASE_URL` for an external build or `PLAYWRIGHT_HOST_PARITY_PORT` to override
the strict local port.

The pinned JsonUI parity matrix runs the real upstream React artifact beside Unifold. In addition to
tree/IR/static-output cases, its behavioral case drives upstream shorthand binding and AJV
validation against Unifold's declared store and required validation behavior, then verifies the
exact redacted canonical event chain. Run it with `pnpm test:jsonui-parity`; use explicit Chromium
and WebKit projects when auditing the documented elevated-Windows Firefox runner limitation.

The deterministic 1k/10k node-store suite asserts exact selective-dispatch and aggregate-validation
behavior on every machine. The separate benchmark emits direct p50/p95/p99 and forced-GC heap JSON;
its timings remain descriptive until its runner and budgets are ratified, while the provisional heap
leak sentinel is a release check. See [performance evidence](./performance.md).
The same suite compiles a real 1,000-rule JSON Logic dependency graph as forty isolated 25-rule
chains. A root edit must evaluate exactly one chain, emit exactly 25 typed commands, and leave the
other 975 rules untouched; the isolated profile records its direct p50/p95/p99 latency.
The combined reactive-transaction fixture drives the public runtime through one 100-control leaf
edit, synchronous leaf/group/form validation, ancestor aggregation, and a 20-rule transitive chain.
It requires the exact 23-node change set and 21 command events, one selector observation carrying
the committed revision and final rule value, and no unrelated selector observation. The benchmark
enforces the provisional 8 ms p95 transaction and 4 ms p95 rule limits and records both gate results
in its JSON artifact.
The same profile alternates 50 paired five-edit batches between identical 10,000-node stores with
zero and 2,000 indexed selections. Subtracting the two batch medians isolates selection-dispatch
overhead without assigning an unrelated scheduler pause to the selection index; p95 must remain at
or below the unchanged 2 ms architecture limit.
The canonical event-path fixture ingests commit, submit, approval, navigation, and error intent
categories through the public runtime. It requires canonical sequences, identical event identities
on the public stream and owning actor, exactly one delivery per category, and no delivery after a
duplicate is rejected. A 500-sample profile measures validated ingress through the actor's
synchronous `send` and enforces the unchanged 8 ms p95 limit.
The document-compilation fixture builds exact schema-valid 500-node and 2,000-node documents and
exercises the public composition-expansion and IR compiler boundary. Correctness assertions require
the exact render-order count, validation rejection, cache-result equality with reference isolation,
and bounded retention. The benchmark enforces 50 ms p95 for cold 500-node preparation, 16 ms p95
for a prewarmed `UnifoldDocumentCompiler`, and 200 ms p95 for full 2,000-node validation and
normalization.
The lifecycle-memory profile first runs five public application cycles to establish bounded
element-registration and renderer caches. It then runs twenty schema-valid 500-node
mount/revision/dispose cycles, forcing garbage collection after each cycle and at the final
measurement. Retained heap growth must remain strictly below 2% of the post-warm-up baseline; the
report includes every post-cycle sample, retained bytes, percentage growth, and peak heap.
The large-collection fixture compiles and mounts an exact schema-valid 10,000-option `VirtualList`
through the public application facade for twenty startup samples. Its combined gate requires p95
startup at or below 1,000 ms and no more than 200 rendered option rows. Unit and Chromium journeys
scroll to distant windows, require focus and committed selection continuity, then use the listbox
keyboard contract to commit a new value through the runtime.
The native-collection fixture compiles and mounts an exact schema-valid 1,000-row `Table` through
the same public facade for twenty startup samples. Every sample must render exactly 1,000 native
body rows and the p95 must remain at or below 1,000 ms. Unit and Chromium/WebKit journeys require
native caption/header semantics, escaped hostile text, rejected-update rollback, retained host
identity, and valid-update recovery.
The native interactive-collection fixture mounts an exact 1,000-row `DataGrid` twenty times and
then performs one canonical sort and selection per mount. It gates startup at 1,000 ms p95, sort
updates at 250 ms p95, and selection updates at 100 ms p95 while requiring all 1,000 rows, the exact
sorted first-row ID, and the exact selected-row ID. Its Chromium/WebKit journey covers keyboard
focus, native table/input semantics, axe, escaped hostile text, invalid-update rollback, stable host
identity, and recovery.
The virtualized composite fixture mounts an exact 10,000-row `MasterDetail` twenty times and then
performs one canonical selection/detail projection per mount. It gates startup at 1,000 ms p95 and
selection at 100 ms p95 while requiring no more than 200 master options, the exact selected-row ID,
and matching visible detail. Its Chromium/WebKit journey covers keyboard focus, responsive
single-column reflow, axe, escaped hostile text, classified static output, invalid-update rollback,
stable host identity, and recovery.
The virtualized search fixture mounts an exact 10,000-result `SearchResults` twenty times and then
performs one controlled query and keyboard selection per mount. It gates startup at 1,000 ms p95,
query and selection updates at 100 ms p95, and requires no more than 200 result options plus exact
query/selection state. Its Chromium/WebKit journey covers native search and listbox semantics,
polite count status, keyboard focus, axe, escaped hostile text, classified static output,
invalid-update rollback, stable host identity, and recovery.
The workflow fixture mounts an exact 100-step `Stepper` beside a 100-panel `Wizard` twenty times,
selects the distant final step in each, and requires exactly one visible Wizard panel. Its gates cap
combined startup at 1,000 ms p95, both selection updates at 100 ms p95, and the combined step-button
DOM at 200. Chromium/WebKit journeys cover roving keyboard focus, Home/End and arrow behavior,
linear disabled-step skipping, canonical state, explicit completion, axe, escaped hostile text,
classified static navigation, invalid-update rollback, stable hosts, stable child panels, and recovery.
The read-only audit fixture mounts an exact 10,000-entry `AuditLog` twenty times and scrolls to a
deterministic distant window on every mount. It gates startup at 1,000 ms p95, distant scrolling at
100 ms p95, and rendered entry elements at 200 while requiring the exact first distant entry ID.
Its Chromium/WebKit journey covers named section, ordered-list, and native-time semantics;
keyboard-scroll focus; axe; escaped hostile text; classified static output; exact duplicate-ID
diagnostics; last-known-good rollback; stable host identity; and recovery. The component presents
authorized server records but never treats browser telemetry or runtime events as a durable audit
record.
The remote-data fixture warms exactly 1,000 registered query keys, then resolves the complete set
twenty times while requiring zero additional adapter calls. A paired cache fixture invalidates one
shared tag and requires exactly 1,000 removals and zero survivors. The executable p95 gates are 250
ms for the cached batch and 100 ms for invalidation. Unit and XState integration tests cover exact
schema/runtime rejection, paging keys, retention/LRU behavior, offline recovery, retry selection,
optimistic commit/rollback, conflicts, cross-context invalidation, supersession, cancellation,
timeout abort, stale completion, and raw-adapter-error containment.
The control-plane durability fixture creates a fresh SQLite database, commits exactly 1,000
tenant-keyed documents, and requires matching revisions, audits, retained realtime facts, and
pending outbox rows. It then drains exactly 1,000 ordered rows in bounded 100-message lease and
acknowledgement batches with no duplicates or survivors. Executable p95 limits are 2,000 ms for the
atomic commit batch and 500 ms for the complete outbox drain. The same fixture encrypts the exact
tenant snapshot and verifies a disposable SQLite restore under a 2,000 ms p95 gate, requiring the
recorded key identity, integrity digest, and last-known-good checkpoint. The package-level shared
conformance suite runs against memory and SQLite stores and adds conflicting/concurrent idempotency
reservations, lease partitioning, expiry takeover, stale-owner rejection, release/retry, tenant
isolation, verified restore, database-trigger rollback, OpenFGA fail-closed mapping, telemetry
redaction, encrypted-recovery tampering/cancellation, and session/CSRF admission cases.
The async-store fixture executes exactly 1,000 authorized optimistic session commits and exactly
1,000 external snapshots through a mounted application's normalized runtime. It requires advancing
revisions, the exact final value, zero provider write echoes, and executable p95 limits of 2,000 ms
and 5,000 ms respectively. The typed-store Playwright journey separately proves pre-render
hydration, local async settlement, external DOM/runtime projection, and disposal behavior.
The governed-document fixture executes exactly 1,000 accepted signed loads and exactly 1,000
revoked-key denials per sample through the public loader. Its 5,000/1,000 ms p95 gates also require
exact compilation or stable denial diagnostics, verified issuer/key/hash/receipt evidence for every
acceptance, and one metadata-only durable-audit receipt for every operation.
The Chromium scale journey complements the Node suite by observing all 1,000 or 10,000 rendered
hosts in one page-context pass. It requires one render-counter mutation, unchanged unrelated counts,
retained element and shadow-input identity/focus, canonical event order, and an exact one-node commit.
It also writes 20-sample input-to-next-frame p50/p95/p99 evidence for both sizes to
`benchmark-results/browser-interaction.json`.

Registration journeys mount a second application against the same native registry and require an
idempotent result in every engine. A separate iframe journey preloads an incompatible constructor,
requires a typed rejection with zero missing-tag definitions, and verifies the parent realm remains
intact. Fake-registry unit tests add malformed metadata, tag mismatch, constructor alias, missing
registry, same-release, different-release, and unexpected-definition-failure coverage.

## Required assertions

Every reference journey checks the visible result, expected interaction ingress, and committed
revision state. Runtime integration journeys separately assert public-safe canonical facts and their
disclosure metadata. A state-changing scenario names both affected node IDs and important unaffected
IDs. Keyboard paths assert focus movement and activation explicitly. Public semantic journeys parse
the emitted JSON-LD, require one owned head block, and compare bound values with the corresponding
committed visible control.

Composition journeys assert deterministic expanded root, internal, and slot IDs. They then prove that those IDs flow unchanged through the canonical event source, selective-update diagnostics, runtime-owned aggregate snapshot, and Schema.org binding. User actions still prefer accessible roles and labels; expanded IDs are assertion identities, not substitutes for accessible selectors.

Dynamic-document journeys revise the authored JSON in the running application and assert the
canonical `structure.reconcile` fact, inserted hosts, retained dirty values, focus and element
identity, and JSON-LD parity. The same journey submits invalid JSON and proves the prior revision
remains the last-known-good UI. Unit tests inject a renderer failure after runtime commit and verify
the compensating reconcile restores runtime and document state.

Public form journeys assert that submitted and reset values and their full event snapshots equal the
normalized runtime aggregate. Non-public form journeys assert metadata-only disclosure based on the
most restrictive descendant: no aggregate value, validation parameters, or snapshot may enter the
runtime stream. The reference journey combines boolean, string, and string-array controls, proves
disabled-value omission and raw retention, and checks selective reset projection.
The three-browser suite also drives a Valibot-backed form-level name-confirmation rule through
invalid submission, affected-node metadata, correction, error removal, and valid resubmission.
It then changes only the source field and proves the unchanged affected field gains and loses its
accessible error through transactional route invalidation.
The workflow journey proves that the submitted form fact reaches its scope-owned XState actor, the
selected registered command updates only its target through a later transaction, and the command
fact points back to the form fact through `causationid`. Unit tests cover unknown command rejection,
broken machine owners and targets, undeclared fields, unchanged actor retention, and
last-known-good updates.
Unit tests subscribe at root, source-node, and ancestor-scope levels and compare event object
identity while reading the final aggregate snapshot during each callback.

Run axe in every meaningful component state, including validation failures, expanded overlays, loading, disabled, and empty states. A clean automated scan is not WCAG conformance: retain manual keyboard, zoom, forced-color, screen-reader, and browser/assistive-technology evidence.

Async validation tests must cover successful and invalid results, actor cancellation, a
non-cooperative stale completion, touched-state projection, lifecycle event identity, and recovery.
The reference Playwright journey exercises cancellation and accessible error presentation in all
three browser engines; the runtime integration test resolves the stale request after the current one
to prove the state guard independently of browser timing.

## Determinism and artifacts

Tests use isolated browser contexts and semantic waits. Do not add fixed sleeps, shared accounts, order dependencies, production data, or selectors coupled to implementation details. CI retries once only as diagnostic evidence; a pass after retry remains a flaky-test defect.

Traces are retained on first retry, while screenshots and video are retained on failure. Before
uploading artifacts, redact event/state attachments and scan all outputs for secrets, personal data,
file paths, and restricted field values. Public-safe runtime events do not make a trace, screenshot,
DOM capture, direct snapshot, or transient `unifold-event` safe to export.
