# Implementation progress

This file is the resumable handoff record for the dynamic JSON-driven UI implementation goal.
Update it whenever the active slice, verified evidence, known limitations, or next commands change.
Repository state and command output remain authoritative if this record becomes stale.

## Goal

Complete the architecture and implementation plan in
[`ARCHITECTURE_IMPLEMENTATION_PLAN.md`](./ARCHITECTURE_IMPLEMENTATION_PLAN.md) end to end, with
objective acceptance criteria for the JSON contract, compilation, rendering, bindings,
extensibility, accessibility, security boundaries, integrations, and repeatable performance gates.
Do not declare completion until a requirement-by-requirement audit proves the full goal.

## Current checkpoint

- Date: 2026-08-26
- Branch: `main`
- Foundation checkpoint: `424763d` (`feat: establish JSON-driven UI architecture foundation`)
- Latest implementation checkpoint: `8372fb4` (`test: prove composition migrations in browsers`)
- Verified implementation remote state: `origin/main` independently resolved to
  `8372fb4aed72064395d5de7c2edf4454c118503e` after the implementation push; the progress-only
  commit that records this evidence is pushed immediately afterward.
- Working tree: architecture slice 4 identity, version migration, rollback, focus, measured
  composition compilation, and the dedicated Chromium/WebKit migration journey are implemented,
  fully validated, committed, and pushed as described below. The next interaction families remain;
  Firefox evidence is still blocked before page creation by the external Windows runner defect.
- Authoritative status inventory: [`docs/implementation-status.md`](./docs/implementation-status.md)
- Architecture contract: [`docs/architecture.md`](./docs/architecture.md)
- Verification commands: [`docs/testing.md`](./docs/testing.md)
- Performance evidence: [`docs/performance.md`](./docs/performance.md)

## Last completed implementation slice

The control-plane Fetch and resumable realtime transport slice is complete:

- Framework-neutral Fetch host/client adapters enforce exact operation shapes, bounded UTF-8 and
  JSON bodies, stable HTTP/result mapping, cancellation, and redacted failures.
- Realtime cursor advancement requires a validated contiguous tenant sequence, retains its cursor
  on a gap, and requires an explicit reset after an authoritative reread.
- The control-plane package's scoped typecheck and test run passed with 18 files and 47 tests.
- The repository-wide quality run passed.
- The repository-wide test run passed with 302 package test files and 740 tests, plus tooling,
  script, and performance suites.
- Coverage passed at 97.44% lines/statements, 97.37% functions, and 90.40% branches.
- Build and formatting gates passed; the reference bundle was 175.14 KiB gzip against the
  executable 180 KiB limit.
- The benchmark report schema is 2.12.0 with 31/31 passing gates. The exact 1,000-operation
  control-plane fixtures measured 95.78 ms p95 for Fetch reads against 2,000 ms and 6.01 ms p95
  for realtime resume against 500 ms.
- Chromium and WebKit matrices passed in the current managed environment. Firefox still fails
  before page creation because of the documented elevated-Windows Playwright runner limitation;
  Linux or non-elevated Windows CI must provide that release evidence.

These results describe the committed checkpoint. Re-run affected gates after every new slice and
record new measurements rather than treating the numbers above as proof for later changes.

## Active slice

Architecture slice 4 composition identity, explicit version migration, measured compilation, and
the dedicated Chromium/WebKit migration/accessibility/event journey are implemented, fully
validated, committed, and pushed. Continue with the next prioritized interaction families in
[`docs/implementation-status.md`](./docs/implementation-status.md#next-architecture-slices).
Production provisioning of slices 1 and 2 remains a separate external-environment release gate
rather than unfinished local framework code.

### 2026-08-26 durability checkpoint

The persistence/outbox sub-slice is implemented but not yet committed:

- `ControlPlaneDurableStorePort` defines bounded lease, acknowledgement, and scheduled-release
  commands with canonical UTC, identity, sequence-count, and uniqueness validation.
- Memory realtime retention is separated from pending delivery retention; lease expiry increments
  attempts and rejects stale acknowledgement owners.
- `SqliteControlPlaneStore` uses caller-owned Node SQLite with tenant-keyed `STRICT` tables and
  `BEGIN IMMEDIATE` transactions for document/effect state, audits, realtime history, and outbox
  publication.
- One shared conformance suite runs against memory and SQLite stores. SQLite trigger injection
  proves document and effect publication failures roll back all related rows.
- Scoped control-plane source/test typechecks and 28-file/68-test suite pass. File-length,
  one-to-one colocated
  test, and scoped ESLint gates pass.
- The final five-sample exact workload measured 1,000 SQLite commits at 97.81 ms p95 against 2,000
  ms and a 1,000-row outbox drain at 30.66 ms p95 against 500 ms. Both gates are integrated into
  benchmark report schema 2.13.0, whose regenerated artifact passes all 33/33 gates.
- Node 22.14 emits an experimental warning for `node:sqlite`. Preserve this limitation in release
  evidence; a production driver must either explicitly accept it or pass the same suite.
- Repository-wide Prettier, quality, dependency, and unused-code gates pass. The complete test run
  passes 312 package files and 761 tests plus tooling, script, and 26 performance correctness tests.
  Coverage passes at 97.36% lines/statements, 97.23% functions, and 90.34% branches. The complete
  build passes with the reference JavaScript unchanged at 175.14 KiB gzip against 180 KiB.

### 2026-08-26 infrastructure-integration checkpoint

The remaining control-plane integration sub-slice is implemented but not yet committed:

- `createOpenFgaAuthorizationPort()` maps a closed capability relation and exact percent-encoded
  tenant/actor/resource tuple to the official client's structural `check()` call, pins the model ID,
  checks trusted session capabilities locally, and denies on false, absent, malformed, or thrown
  results.
- `instrumentControlPlaneWithOpenTelemetry()` wraps every service operation with privacy-allowlisted
  spans, a completion counter, and duration histogram. Metrics exclude all high-cardinality identity
  and object/session/input/output values; unexpected errors use a fixed redacted exception.
- Optional handler admission binds one cookie session to the bounded decoded body and requires exact
  Origin, CSRF, active expiry, and no effective revocation before dispatch. Cross-origin, duplicate,
  missing, mismatched, expired, revoked, and non-POST cases deny.
- `EncryptedControlPlaneRecovery` writes AES-256-GCM envelopes through deployment-owned key/vault
  ports, authenticates identity metadata, verifies SHA-256 and bounded JSON, contains provider
  errors, honors cancellation, and advances last-known-good only after isolated verification.
  `SqliteControlPlaneRecoverySource` proves an exact scratch-database round trip.
- Scoped control-plane typecheck and 35-file/86-test suite pass after the refactor. ESLint, file-line,
  and colocated-test gates pass. The complete benchmark report is schema 2.14.0 with 34/34 passing
  gates: 1,000 SQLite commits 94.60 ms p95/2,000; 1,000-row outbox drain 16.72 ms/500; and the
  1,000-document encrypted backup plus scratch restore 40.70 ms/2,000.
- Full repository formatting and quality pass, including 1,328 dependency-cruised modules and 2,941
  dependencies with no violations. The complete test run passes 319 package files and 779 tests,
  tooling/script suites, and 26 performance correctness tests. Coverage passes at 97.20%
  lines/statements, 97.00% functions, and 90.08% branches. The complete build passes with the
  reference JavaScript unchanged at 175.14 KiB gzip against 180 KiB.

### 2026-08-26 async-store contract checkpoint

The standalone async/external store boundary is implemented and committed as `607d208`:

- `connectAsyncStore()` authorizes exact load/subscribe/commit sink operations, contains provider
  failures and malformed results, supports cancellation, and validates every loaded, committed, and
  subscribed snapshot against the declared store schema and quota policy.
- Exact trusted migration edges execute defensively with missing/duplicate/cycle/exception and
  sixteen-step budget rejection. Adapter commits receive the complete validated canonical candidate
  and target data version, preventing a migrated path from patching an old persisted shape.
- Opaque revisions and bounded idempotency keys provide optimistic concurrency. Local overlap,
  stale revisions, subscription echoes, real concurrent updates, and explicit `external-wins`
  arbitration have deterministic evidence. Listener exceptions cannot interrupt store state.
- `createAsyncMemoryStoreAdapter()` provides bounded replay and deterministic local evidence.
  `createAsyncKeyValueStoreAdapter()` independently targets an injected atomic compare-and-set port
  with bounded versioned UTF-8 JSON envelopes and corrupt-notification containment.
- One shared conformance suite runs identical load, commit, idempotent replay, stale conflict,
  external subscription, and disposal cases against both adapters.
- Scoped `@unislang/unifold` tests pass 25 files and 117 tests. The complete repository quality gate
  passes file/function/complexity limits, one-to-one colocated tests, ESLint, all source and strict
  test typechecks, dependency rules over 1,357 modules/2,995 edges, and Knip. The complete test run
  passes 326 package files and 820 tests plus tooling/scripts and 26 performance correctness tests.
  Coverage passes at 97.27% lines/statements, 97.13% functions, and 90.29% branches. The complete
  build passes with the reference JavaScript unchanged at 175.14 KiB gzip against 180 KiB.
- Remaining work for this slice: integrate sessions into the mounted application without a second
  state authority, make async commit results re-enter canonical runtime ingress, add browser
  lifecycle/cancellation/external-update/disposal evidence, then run the full test/coverage/build and
  performance matrix.

### 2026-08-26 mounted async-store checkpoint

The remaining framework integration is implemented, fully validated, committed as `c437e21`, and
pushed to `origin/main`:

- `mountUnifoldApplicationAsync()` compiles first, connects every declared store in parallel, and
  renders only after all authorization, loading, migration, and validation succeeds. Any peer
  failure disposes successful sessions and preserves the container.
- `UiCommandPort` effects may return promises. Canonical `effect.completed`/`effect.failed` facts
  publish only after settlement, redact rejection details, and cannot publish after disposal.
- The mounted controller serializes commits per store, reads the current revision at execution time,
  uses bounded idempotency identities, compensates failed optimistic values, supports a `null`
  compare-and-set base for optional empty stores, and cancels/disposes session work with the app.
- Validated external snapshots enter the normalized graph as one transaction. An explicit trusted
  runtime context suppresses derived store-write effects for that ingress, preventing write echoes
  while retaining validation, rules, aggregates, canonical events, and selective rendering.
- Unit/integration coverage includes delayed success/failure, late disposal, write suppression,
  serialization, conflict rollback, external projection, atomic multi-store failure, optional first
  revision, unchanged-definition updates, and disposal. The typed-store journey passes all three
  cases in Chromium and WebKit. Firefox still fails before page creation for every typed-store case,
  including the pre-existing synchronous cases, under the documented elevated-Windows runner issue.
- Complete quality passes, including all source and strict test typechecks, ESLint, Knip, and
  dependency rules over 1,369 modules/3,062 edges. The full test run passes 329 package files and 831
  tests, tooling/script suites, and 27 performance correctness tests.
- Coverage passes at 97.21% lines/statements, 96.98% functions, and 90.06% branches. Build and the
  clean packed-consumer lifecycle pass; the reference JavaScript is 179.52 KiB gzip against 180 KiB.
- Benchmark report schema 2.15.0 passes 36/36 gates. Five exact samples measured 1,000 authorized
  async commits at 75.43 ms p95 against 2,000 ms and 1,000 mounted external projections at 104.28 ms
  p95 against 5,000 ms, with exact revisions/final values and zero provider write echoes.

### 2026-08-26 document-provenance and behavioral-parity checkpoint

Architecture slice 3 is implemented, fully validated, committed as `6dfc3d9`, and pushed:

- Every accepted document now carries the SHA-256 of its exact pre-parse payload bytes. An optional
  governed provenance policy resolves a host-trusted issuer plus active/revoked Ed25519 key state,
  rejects revocation before verification or parsing, and forbids simultaneous legacy/policy
  resolvers.
- Governed loading records metadata-only acceptance or denial evidence through a host audit port.
  Audit records omit payload/signature bytes; bounded IDs and canonical UTC receipts are validated,
  and missing, malformed, or failed audit receipts fail a would-be successful load closed.
- Provider exceptions are contained behind stable diagnostics. Successful results expose verified
  issuer/key identity, payload fingerprint, applied migrations, and the durable audit receipt.
- The real pinned upstream JsonUI runner now exercises simplified `store`/`path` actions and AJV
  validation beside the corresponding declared Unifold store and required-rule behavior. It proves
  equal initial/edited values and touched valid/invalid outcomes without installing upstream state
  as Unifold authority.
- The same browser case requires the exact six-event Unifold input chain, source/correlation/
  causation/transaction identity, contiguous runtime sequence, exact revision, and metadata-only
  disclosure without snapshots. The full Chromium/WebKit parity matrix passes 18/18 cases.
  Firefox fails all 9 old and new cases before page creation with the existing elevated-Windows
  runner error; this is unchanged environment evidence rather than a behavior regression.
- The scoped `@unislang/unifold` source typecheck and 29-file/136-test suite pass. Changed-file
  ESLint, strict repository test typechecking, file-size, and colocated-test gates pass.
- Complete repository quality passes, including lint, all source/test typechecks, Knip, and
  dependency rules over 1,377 modules and 3,081 edges. The full test command passes; its package
  matrix is 331 files/843 tests and the performance correctness matrix is 28 tests.
- Coverage passes at 97.20% lines/statements, 97.01% functions, and 90.03% branches. The full build,
  formatting, duplication threshold, and clean packed-consumer lifecycle pass; the reference
  JavaScript is 179.51 KiB gzip against the executable 180 KiB limit.
- Benchmark report schema 2.16.0 passes all 38/38 gates. Five exact samples measured 1,000 governed
  signed loads at 236.73 ms p95 against 5,000 ms and 1,000 revoked denials at 42.58 ms against 1,000
  ms, proving exact outcomes and 1,000 metadata-only audit receipts for each path in every sample.
- No JsonUI profile migration edge was invented: `unifold-jsonui@1.0.0` still has no successor. The
  first real successor must ship its reviewed exact edge, golden fixtures, failure/recovery cases,
  compatibility range, and rollback guidance together.

### 2026-08-26 reversible composition-identity checkpoint

The first architecture slice-4 hardening sub-slice is implemented and committed as `2b38399`:

- Composition instance, template, nested, slot, and supplied-node identity segments now use
  canonical URI-component encoding before the readable `::` namespace is assembled. The codec
  round-trips delimiter, percent, slash, and Unicode input; malformed and noncanonical encoded
  identities fail closed. Previously safe URI-unreserved IDs retain their exact shape.
- The composition manifest declares identity contract `1.0.0` and emits exact new-to-legacy aliases
  only for IDs that the pre-codec grammar could have produced. Authored `::` is now accepted, while
  exports and node provenance retain authored local IDs.
- IR validates alias shape, known compiled targets, inactive sources, distinct identities, and
  one-to-one source ownership. Runtime structure reconciliation repeats state-relative validation,
  atomically migrates compatible dirty control state and focus, and leaves the prior revision intact
  for malformed, stale, active, occupied, or reused aliases.
- All affected package-scoped Vitest wrappers now resolve the root configuration correctly on
  Windows. Runtime command-handler evidence proves aliases cross the event/runtime boundary rather
  than stopping at the lower-level store.
- Full repository quality passes: file/function/complexity rules, colocated tests, ESLint, all source
  and strict test typechecks, Knip, and dependency rules over 1,385 modules/3,104 edges. The package
  matrix passes 333 files/853 tests, and the complete test command passes tooling, script, and 28
  performance correctness tests.
- The complete build passes after enabling deterministic two-pass Terser compression for the
  reference application. Reference JavaScript is 183,660 gzip bytes (179.36 KiB) against the
  unchanged executable 180 KiB limit. The clean packed-consumer lifecycle passes all 3 tests after
  its pinned external dependencies are installed with network access.
- Coverage passes at 97.22% lines/statements, 97.04% functions, and 90.10% branches.
- Slice 4 remains open: next implement reviewed cross-version composition migration edges and
  rollback evidence, then measure representative complete composition compilation and add subtree
  invalidation only if the measurements justify its cache complexity.

### 2026-08-26 composition-version migration checkpoint

The remaining identity-adjacent slice-4 work is implemented, validated, committed as `3e31404`, and
pushed to `origin/main`:

- Hosts register bounded exact definition `{name, version}` edges. Registries reject empty,
  duplicate, cyclic, over-budget, unknown, reused, and incompatible mappings before application
  mutation. Every node owned by a changed instance resets by default; only explicitly mapped public
  exports with equal IR kind and component type preserve state.
- Structural reconcile commands carry validated reset IDs and one-to-one aliases through the public
  event/runtime boundary. Compatible dirty state and DOM focus follow renamed exports; unchanged
  instances retain identity, and codec aliases apply only while their legacy source is active.
- Application updates retain exact prior runtime snapshots. Missing edges and failed candidates keep
  last-known-good authored/runtime state; failed compensation returns a stable diagnostic, disposes
  and quarantines the application, and rejects every later update instead of risking split state.
- A schema-valid 500-instance fixture expands to exactly 1,001 nodes. The schema-2.17.0 benchmark
  report passes all 40/40 gates: full composition compilation measured 9.89 ms p95 and a revision
  changing one instance measured 9.70 ms p95, both against 100 ms. This evidence defers subtree-cache
  and invalidation complexity until representative measurements justify it.
- Full quality passes file/function/complexity, colocated-test, ESLint, all source and strict test
  typechecks, Knip, and dependency rules over 1,393 modules/3,144 edges. The package matrix passes
  335 files/863 tests; performance correctness passes 29 tests; duplication and formatting pass.
- Coverage passes at 97.28% lines/statements, 97.07% functions, and 90.04% branches. Chromium and
  WebKit reference journeys pass 73 with 3 intentional WebKit scale-profile skips. The clean packed
  consumer passes 3/3 after its pinned external dependencies are installed with network access.
- Production reference E2E hooks now compile only in explicit `e2e` mode, and the production bundle
  gate rejects either hook marker. Deterministic three-pass module/toplevel compression yields
  179,850 gzip bytes (175.63 KiB) against the unchanged 180 KiB ceiling.

### 2026-08-26 composition-migration browser checkpoint

The dedicated browser-proof sub-slice is implemented, validated, committed as `8372fb4`, pushed to
`origin/main`, and independently verified at
`8372fb4aed72064395d5de7c2edf4454c118503e`:

- The real reference host registers reviewed `ProfileEditor@1.0.0 -> 2.0.0` preservation and
  `ProfileEditor@1.0.0 -> 3.0.0` reset edges. An unreviewed `4.0.0` target provides deterministic
  rejection and last-known-good recovery evidence.
- The browser journey proves dirty state and focus migrate to the renamed public export, unaffected
  sibling DOM identity remains stable, semantic JSON-LD follows both preserved and reset values,
  and post-migration canonical events contain the successor definition, local ID, correlation, and
  transaction identity. Axe passes after both successful policies.
- The complete Chromium/WebKit reference matrix passes 77 tests with 3 intentional WebKit
  scale-profile skips. Firefox produced no behavioral result: both targeted cases fail before page
  creation in the provisioned Windows runner with `browserContext.newPage` reading `_page` from an
  undefined object. Re-run this exact spec in Linux or a repaired/non-elevated Windows runner.
- Full file/function/complexity, colocated-test, ESLint, source/test typecheck, dependency, Knip,
  formatting, duplication, diff, and production-build gates pass. The unchanged production package
  matrix remains 335 files/863 tests with 29 performance correctness tests and schema-2.17.0's
  40/40 benchmark gates from the immediately preceding implementation checkpoint.
- The production reference build excludes all migration test hooks and measures 179,931 gzip bytes
  (175.71 KiB) against the executable 180 KiB ceiling.

## Immediate resume procedure

1. Read this file, `docs/implementation-status.md`, and the composition sections of the architecture
   plan for slice 4.
2. Inspect `git status --short --branch` and preserve any post-checkpoint user changes.
3. Confirm the composition-migration browser checkpoint is present on `origin/main`, then continue
   into the prioritized interaction-family gap (combobox/autocomplete, menus, overlays, tabs,
   navigation, upload, and virtualization) without adding subtree caching unless the executable
   composition gates regress. Re-run the dedicated Firefox journey when a working runner is
   available; do not treat the current pre-page failure as behavioral evidence.
4. Keep production modules and their adjacent tests within the enforced complexity, function-length,
   file-length, and one-test-per-module limits.
5. Use `apply_patch` for edits. Run Prettier before assuming a diff is ready.
6. Update this record after each material implementation or validation checkpoint.

PowerShell setup for repository commands:

```powershell
$env:Path = 'D:\ngine\.tools\node-v22.14.0-win-x64;' + $env:Path
pnpm.CMD install --offline
```

Do not reinstall unless dependencies or the local store actually require it. Prefer the package's
declared scripts discovered from `package.json`; do not guess validation command names.

## Completion audit queue

The remaining ten architecture slices in `docs/implementation-status.md` are still open. After each
slice, reconcile the status inventory rather than narrowing the goal to the latest implementation.
Before final completion, construct a traceability audit covering every explicit requirement and
named gate in the architecture plan, with direct source/test/runtime/benchmark evidence for:

- schemas, bounded parsing, diagnostics, versioning, and migration;
- component resolution, rendering, reconciliation, host neutrality, and lifecycle;
- singular state ownership, store/data/event bindings, validation, rules, actors, and effects;
- trusted and untrusted extensibility boundaries, authorization, privacy, and resource limits;
- accessibility semantics, keyboard/input behavior, browser coverage, and required manual evidence;
- control-plane, collaboration, data, AI, export, semantic, devtools, and Studio integrations;
- deterministic unit, integration, end-to-end, recovery, race, and adversarial cases;
- representative render/update and service workloads with executable regression thresholds;
- clean build, lint, typecheck, coverage, package-consumer, and release evidence.

The project is not complete while any authoritative evidence is missing, indirect, stale, or
contradicted. Known external release gates (Firefox runner, license/scope selection, production
infrastructure and manual accessibility/security evidence) must remain explicit and cannot be
silently waived.

## Session log

- 2026-08-25: Established and validated the initial 31-gate architecture baseline; committed it as
  `424763d`.
- 2026-08-25: After explicit destination confirmation, pushed the initial baseline to
  `https://github.com/unislang/unifold.git` and verified remote `main` matches local `HEAD` at
  `424763dad467948f3b75fefd2c2be8cff216fcb4`.
- 2026-08-25: Resumed implementation planning at the control-plane transaction/outbox and alternate
  store slice; added this persistent handoff record before editing production code.
- 2026-08-26: Implemented the durable outbox and SQLite alternate store, passed scoped correctness
  and quality checks, measured both new benchmark gates, and began repository-wide validation.
- 2026-08-26: Completed the OpenFGA/OpenTelemetry, transport admission, and encrypted external
  recovery integrations; regenerated 34/34 benchmark gates and passed the full quality, test,
  coverage, and build matrices. Committed the complete slice as `69f8e84`, pushed it to
  `https://github.com/unislang/unifold.git`, and independently verified remote `main` at the full
  hash above.
- 2026-08-26: Began architecture slice 2; implemented the authorized async session, trusted data
  migrations, optimistic/external conflict policy, complete-candidate commit boundary, and two
  adapters with one conformance suite. Full quality passes; committed and pushed the checkpoint as
  `607d208`, then independently verified `origin/main` at the full hash above. Mounted/browser
  integration remains.
- 2026-08-26: Completed mounted async store integration, async canonical effect settlement,
  write-suppressed external ingress, optional first revisions, compensation/disposal, public API,
  Chromium/WebKit evidence, clean-consumer validation, and two new performance gates. The complete
  local matrix passes. Committed the implementation as `c437e21`, pushed it to
  `https://github.com/unislang/unifold.git`, and independently verified remote `main` at
  `c437e212cdc2f34c0fa80982a15e8eb195796b01`.
- 2026-08-26: Implemented governed document issuer/revocation/audit provenance and expanded the real
  upstream JsonUI browser oracle to binding, touched validation, and exact redacted canonical-event
  semantics. Added exact accepted/revoked provenance workload gates, regenerated the schema-2.16.0
  38/38 report, and passed complete quality, 331-file/843-test package coverage, performance,
  coverage, build, packed-consumer, formatting, duplication, and Chromium/WebKit parity matrices.
  Committed the implementation as `6dfc3d9`, pushed it to
  `https://github.com/unislang/unifold.git`, and independently verified remote `main` at
  `6dfc3d936fc92a46cb4edffb20714e5a73a6793d`.
- 2026-08-26: Implemented reversible composition identities, manifest-versioned one-to-one legacy
  aliases, IR/runtime validation, and atomic compatible dirty/focus migration. Full quality,
  333-file/853-test package coverage, complete tests, coverage, build, bundle, and clean-consumer
  gates pass. Committed the checkpoint as `2b38399` and pushed it to
  `https://github.com/unislang/unifold.git`; cross-version definition migrations and measured
  composition compilation remain next.
- 2026-08-26: Implemented exact bounded composition-version migration edges, reset-by-default and
  public-export preservation, DOM-focus migration, exact rollback/quarantine behavior, and two
  500-instance compilation gates. Full quality, 335-file/863-test package coverage, 40/40 benchmark,
  coverage, production bundle, Chromium/WebKit, and clean-consumer validations pass. Committed as
  `3e31404`, pushed to `https://github.com/unislang/unifold.git`, and independently verified remote
  `main` at `3e3140431630cfc1aa082ee699f893c4b8b50a07`.
- 2026-08-26: Added the real reference-host preservation/reset migration edges and a dedicated
  Chromium/WebKit journey proving rejection recovery, state/focus and semantic migration, stable
  sibling identity, canonical successor event provenance, and axe accessibility. The full reference
  matrix passes 77 tests with 3 intentional skips; Firefox remains an external pre-page runner
  limitation. Full final quality and production-build gates pass at 175.71 KiB gzip. Committed as
  `8372fb4`, pushed to `https://github.com/unislang/unifold.git`, and independently verified remote
  `main` at `8372fb4aed72064395d5de7c2edf4454c118503e`.
