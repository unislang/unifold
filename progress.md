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
- Latest pushed checkpoint: `e4c7fb6` (`docs: record async store checkpoint`)
- Remote state before this slice: `origin/main` and local `HEAD` were independently verified at
  `e4c7fb662f90fe32df3c488bbde4189ba3448a62`.
- Working tree: the fully validated mounted async-store slice described below is ready for its
  requested commit and push.
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

The framework-owned portion of architecture slice 2, async/external store adapters, is complete and
awaiting the requested commit/push. Resume with slice 3 in
[`docs/implementation-status.md`](./docs/implementation-status.md#next-architecture-slices): actual
profile migration edges when a successor exists, richer issuer/revocation/audit provenance, and
binding/validation/canonical-event parity. Production provisioning of slices 1 and 2 remains a
separate external-environment release gate rather than unfinished local framework code.

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

The remaining framework integration is implemented and fully validated, ready to commit:

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

## Immediate resume procedure

1. Read this file, `docs/implementation-status.md`, and the provenance/parity sections of the
   architecture plan for the next local slice.
2. Inspect `git status --short --branch` and preserve any post-checkpoint user changes.
3. Verify the mounted async-store commit and remote `main`, then begin implementation-status slice
   3 without reopening completed store ownership decisions.
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
  local matrix passes; commit and push are the next requested actions.
