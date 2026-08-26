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

- Date: 2026-08-25
- Branch: `main`
- Local checkpoint: `424763d` (`feat: establish JSON-driven UI architecture foundation`)
- Remote state: `origin/main` was created at
  `424763dad467948f3b75fefd2c2be8cff216fcb4` and independently verified with `git ls-remote`.
- Working tree at checkpoint: clean. This progress file is the first post-checkpoint change.
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

Implement the first item under **Next architecture slices** in
[`docs/implementation-status.md`](./docs/implementation-status.md#next-architecture-slices), beginning
with the control-plane durability and replaceability proof:

1. Define the transactional persistence boundary and durable outbox semantics without coupling the
   service to a particular database.
2. Add transaction rollback, atomic state/outbox commit, leasing, acknowledgement, retry, expiry,
   and concurrent-reservation conformance cases with deterministic clocks and identities.
3. Add a genuinely independent second store implementation and run the same conformance suite
   against both implementations.
4. Add representative performance fixtures and explicit regression thresholds for transaction and
   outbox workloads.
5. Update the control-plane contract, status, testing, performance, and changeset evidence.
6. Run scoped checks first, then the complete repository validation matrix.

Items 1-6 above are complete. The active continuation of architecture slice 1 was:

1. Add an OpenFGA authorization adapter with exact tenant/actor/resource tuples, deny-by-default
   error containment, and deterministic client test doubles.
2. Add OpenTelemetry trace/metric integration that exports only allowlisted, classification-safe
   attributes and preserves request/correlation/trace causality.
3. Add an encrypted external-backup port and scheduled restore-drill evidence with integrity,
   key-identity, failure, cancellation, and last-known-good behavior.
4. Add transport-level session and CSRF admission integration with origin, cookie/header token,
   expiry/revocation, and unsafe-method negative cases.
5. Extend performance/operational gates where these adapters introduce measurable work, update
   documentation and this record, then repeat the complete validation matrix.

Items 1-5 are now implemented and scoped checks pass. The active slice is the repository-wide
validation and documentation checkpoint, followed by architecture slice 2 (async/external store
adapters) after this state is preserved.

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

## Immediate resume procedure

1. Read this file, `docs/implementation-status.md`, the control-plane sections of the architecture
   plan, and `packages/control-plane/README.md`.
2. Inspect `git status --short --branch` and preserve any post-checkpoint user changes.
3. Inspect the existing control-plane ports, in-memory adapter, service, schemas, and conformance
   tests before defining the new transaction/outbox contracts.
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
  coverage, and build matrices. This post-checkpoint slice remains uncommitted pending the next
  requested repository checkpoint.
