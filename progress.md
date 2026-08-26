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
- Latest local implementation checkpoint: `d4a3067` (`feat: add JSON number field primitive`). The
  local `origin/main` tracking reference remains at `4f60993` until the requested push is verified.
- Current local implementation: the `NumberField` family is committed. A separate governed AI/Studio
  vertical slice, native string-enum work, the Studio dogfood example, and executable prevention of
  import-then-local-re-export feature modules remain uncommitted and must be preserved separately.
- Goal status: active. SearchField, CheckboxGroup, Switch, DateField, Toast, and Pagination remain
  component-family gaps, followed by broader Studio and production-integration gates.
- Authoritative status inventory: [`docs/implementation-status.md`](./docs/implementation-status.md)
- Architecture contract: [`docs/architecture.md`](./docs/architecture.md)
- Verification commands: [`docs/testing.md`](./docs/testing.md)
- Performance evidence: [`docs/performance.md`](./docs/performance.md)

## Active slice

The current slice proves that the AI SDK and Studio operate through governed framework seams instead
of bypassing the JSON compiler, event fabric, state authority, or export boundary:

- AI context is catalog-derived, bounded, and recursively redacted. Proposal values enforce byte,
  depth, value-count, string-length, finite-number, plain-object, cycle, shared-reference, and
  prototype-key boundaries before patching.
- Framework-derived risk cannot be downgraded by model output. Stable IDs survive ancestor patches;
  approved proposals may create initial Schema.org markup; compiler, accessibility, and static
  export requested checks execute before acceptance. Model `expectedOutcomes` remain descriptive
  until product-level outcome evaluators are added.
- Proposal commit and Studio apply compare the exact canonical base immediately before mutation,
  closing same-thread asynchronous overwrite races. Multi-process compare-and-set belongs in the
  collaboration/control-plane boundary.
- `@unislang/unifold-studio` owns an XState session, bounded request lifecycle, isolated preview,
  structural diff, explicit review/apply, and truthful portable/static export. Preview receives only
  allowlisted layout/composition inputs and cannot inherit host commands, guards, validators,
  renderer callbacks, or stores.
- The JSON-authored Studio example routes chat actions through the canonical event stream, reports
  asynchronous state through an accessible live region, preserves validated `WebPage` Schema.org
  output, and excludes provider generation and credential markers from browser assets.
- `NumberField` spans contract, catalog, IR, forms, Lit/native FormData, facade, hierarchical JSON,
  static export/hydration, performance, and Playwright paths. Range/step logic shares the finite
  JSON-number constraint helper instead of duplicating validation.
- `pnpm quality:reexports` rejects feature modules that import a local binding and export that same
  binding. Feature modules expose owned operations; direct package export maps remain the deliberate
  public-boundary mechanism.

Current local evidence: `pnpm quality`, `pnpm test`, `pnpm build`, and `pnpm test:coverage` pass.
Coverage is 97.48% statements/lines, 96.77% functions, and 90.01% branches against unchanged 90%
thresholds. Dependency-cruiser validates 1,921 modules and 4,264 dependencies with no violations.
The Studio asset boundary and complete Chromium/Firefox/WebKit matrix pass 9/9. Studio production
JavaScript is 226.99 KiB gzip against its 250 KiB ceiling. The reference startup closure is 181.20
KiB gzip against a narrowly rebased executable 184 KiB limit, with 35,906 post-mount gzip bytes. The
NumberField portion is committed as `d4a3067`; no commit or push has been performed for the separate
AI/Studio portion.

Remaining AI/Studio gaps are explicit: provenance-bound third-party catalog manifests; complete
component property, event, machine, and rule authoring context; durable actor identity, approval
audit, and separation of duties; provider/model token, cost, time, retry, and signature policy;
executable product outcome evaluators; collaboration/rebase/undo; negative browser journeys for
cancellation, stale apply, rejection, and export failure; and the full multi-turn design surface.

## Prior NumberField checkpoint

- Date: 2026-08-26
- Branch: `main`
- Foundation checkpoint: `424763d` (`feat: establish JSON-driven UI architecture foundation`)
- Previous published progress checkpoint: `5735ec81b0d1b83ee1d688e6e42b5b75e55f74c3`
  (`docs: record native form checkpoint`).
- Latest verified implementation checkpoint: `5e15efd478c2249be198aa93e7c5f93d526e71f6`
  (`feat: add JSON content media primitives`), pushed to `https://github.com/unislang/unifold.git` and
  independently verified at `refs/heads/main` with `git ls-remote`.
- Completed implementation slice: catalog-authoritative `NumberField` is implemented across contracts,
  catalog sidecars, IR and form validation, deferred Lit definitions, package subpaths, static
  rendering/hydration, the Scratch-style hierarchical JSON example, browser evidence, and an exact
  100-control performance gate. It is committed locally as
  `d4a3067` (`feat: add JSON number field primitive`) and awaits remote verification.
- Goal status: active. This checkpoint does not complete the architecture plan; the authoritative
  inventory still lists SearchField, CheckboxGroup, Switch, DateField, Toast, and Pagination as
  component-family gaps, followed by the broader production-integration gates.
- Authoritative status inventory: [`docs/implementation-status.md`](./docs/implementation-status.md)
- Architecture contract: [`docs/architecture.md`](./docs/architecture.md)
- Verification commands: [`docs/testing.md`](./docs/testing.md)
- Performance evidence: [`docs/performance.md`](./docs/performance.md)

## Prior NumberField slice

The current slice closes the catalog-authoritative numeric-control gap while preserving the public
authoring model requested by the user:

- [`scratch/angular-ui/DYNAMIC-UI-README.md`](./scratch/angular-ui/DYNAMIC-UI-README.md) remains the
  authoring source of truth: exact `layoutType`/version selects a trusted layout, typed `variables`
  populate it, and nested `type`/`props`/`children`/named `events` lower into canonical
  `$comp`/`$children` JsonUI, normalized IR, one state authority, and trusted XState commands.
- `NumberField` carries finite `number | null` canonical state. Its catalog requires `label`, supports
  `name`, `min`, `max`, positive `step`, disabled/required state and `onInput`, and rejects invalid
  ranges, non-finite numbers, off-step values, unknown properties, and authored children before
  rendering.
- The deferred Lit element uses a native `input[type=number]`, shared single-line styles, and the
  reusable form controller. Native validity, form ownership, `FormData`, disabled-fieldset behavior,
  reset/state restoration, and canonical numeric events remain synchronized without admitting the
  native input as a second state authority.
- Static export emits a usable native fallback. Hydration migrates an edited `valueAsNumber`, keeps
  focus and form behavior, and rejects wrong-type, non-finite, out-of-range, or off-step tampering
  without replacing the fallback.
- The real hierarchical example authors `contact-age` under `variables.fields` and maps
  `onInput: AGE_CHANGED`; browser evidence proves the resulting canonical event contains numeric
  `42`, updates the controlled host, and remains axe-clean.

Current verification evidence on 2026-08-26:

- Repository-wide `pnpm quality` passes file limits, colocated tests, re-export policy, ESLint, all
  workspace and test typechecks, Knip, and the dependency audit (1,921 modules and 4,264 edges).
- Repository-wide `pnpm test` passes 474 Vitest files/1,190 tests, 18/18 tooling tests, 8/8 generated
  component-definition tests, the theme/reference script gates, and 40 performance-correctness tests
  with 27 opt-in profiles skipped.
- Full benchmark schema 2.27.0 passes all 52/52 executable gates. The exact 100-NumberField fixture
  records 0.60/1.85/6.78 ms p50/p95/p99 across 50 samples against a 100 ms p95 ceiling, with exact
  final native numeric value `123.5`.
- The production reference build passes its current executable 184 KiB initial-closure budget at
  185,453/188,416 gzip bytes with 35,883 post-mount gzip bytes. The feature checkpoint records the
  cumulative budget recalibration from 180 KiB to 184 KiB explicitly in executable code and testing
  documentation.
- Focused Chromium evidence passes 1/1 hierarchical and 3/3 static-export NumberField journeys.
  Focused WebKit evidence independently passes the same 1/1 and 3/3 journeys. The static cases prove
  no-JavaScript fallback, edited numeric migration, and off-step rejection.

Resume boundary: commit this progress checkpoint, then push and independently compare
`git ls-remote origin refs/heads/main` with the local checkpoint commit. Preserve and do not
accidentally stage the concurrent AI/Studio work, reference feature-module re-export work,
`ARCHITECTURE_IMPLEMENTATION_PLAN.md`, `CONTRIBUTING.md`, root dependency/config edits, or the
separate Studio changeset. After the remote checkpoint, continue with the next ordered catalog gap
(`SearchField`) through the same Scratch-style JSON, IR, native/static, browser, accessibility, and
performance boundaries.

## Prior hierarchical and component slice detail

The public authoring contract and executable example are implemented, committed, and present on the
local `origin/main` tracking reference. Post-checkpoint implementation continues. On 2026-08-26 the
user clarified that
the intended JSON UI is modeled on
[`scratch/angular-ui/DYNAMIC-UI-README.md`](./scratch/angular-ui/DYNAMIC-UI-README.md): a
`layoutType` selects a reusable definition, `variables` parameterize it, and nested nodes use
`type`, `props`, `children`, and named `events`. The current `$comp` document and composition model
already supplies the validated compiler/runtime target, but it is too low-level to be the only
public authoring surface.

The strict high-level layout profile now lowers the intended syntax into the existing
composition/IR boundary. Preserve stable IDs, exact schemas, trusted named event/XState routing,
one normalized state authority, non-executable expressions, and exact JSON Pointer diagnostics;
the implementation does not reproduce the scratch prototype's `any`, `innerHTML`, silent fallback,
runtime fetch, or unchecked string interpolation behavior. Direct `$comp`/`$children` JsonUI remains
supported, but it is a canonical compiler input rather than the only ergonomic authoring surface.

The current pipeline is `layoutType/variables/type/props/children/events` -> canonical
`$comp/$children` JsonUI -> normalized IR -> runtime/renderer. A node `events` map uses the
enum-backed signals `activated`, `blurred`, `input`, `reset-requested`, `submit-requested`, and
`submitted`. IR validates each signal against the component catalog and removes the binding from
rendered properties. The application remaps only the matching source node's canonical fact into the
named XState input while retaining the original fact in `runtime.events$`.

The standalone [`examples/hierarchical-site`](./examples/hierarchical-site) web project is
implemented with page JSON plus a separately reviewed external layout registry, a derived consent
rule, an XState workflow, Schema.org binding, runtime inspector, Vite build, adjacent unit test, and
a dedicated Playwright workspace. Its lock, typecheck, unit, production-mode build, and four
Chromium/WebKit functional/accessibility paths pass. The latest two Firefox cases fail before page
creation with the managed Windows `_page` runner defect and provide no application evidence.

The executable layout JSON Schema is packaged and enforced before lowering. JSON safety adds a
64-level depth, 50,000-value, finite-number, 65,536-character-string, plain-object, cycle, shared-
reference, and prototype-key boundary. Boolean conditions and durable-key repetition lower through
the existing reversible identity codec.

Authored source-pointer provenance, layout-specific last-known-good recovery, a representative
layout compilation gate, and the trusted external registry boundary are now implemented.
Diagnostics from canonical IR are remapped to the
exact authored `layoutType` template or variable-supplied node pointer, including `/type`, `/props`,
`/children`, and `/events` suffixes. Invalid layout revisions retain the prior authored document,
runtime revision, state, and DOM identity. Host-reviewed definitions enter only through a bounded
immutable registry option; there is no document-selected URL, callback, implicit latest version, or
runtime lookup. Exact-version collisions reject, and registry source diagnostics use
`/$layoutRegistry/definitions/{index}`.

The Tooltip and eleven other larger interaction families are now explicit deferred subpath imports.
Their catalog, IR, element, static export, registration, and browser paths are implemented; the
latest production build emits 25,417 deferred gzip bytes and the initial reference closure passes at
184,037 bytes (179.72 KiB) against the unchanged 184,320-byte gate.

### 2026-08-26 hierarchical authoring checkpoint (release verified and tracked remotely)

- Added deterministic Scratch-compatible lowering for exact `layoutType`/`layoutVersion`, typed
  variables, nested `type`/`props`/`children`, safe variable references, and named `onClick`,
  `onInput`, `onBlur`, `onSubmit`, and `onReset` bindings. Ordinary UiDocuments continue through the
  existing compilation path.
- The release-verified implementation is committed as
  `777ebcdd9cbc4d932273115530ca751ee6bd0a0b` (`feat: add hierarchical JSON layout authoring`).
- Added `UiComponentEventBinding` and `UiNodeEventBindings` contracts plus JSON Schema coverage.
  Component event capabilities are catalog-declared; IR rejects unknown, unsupported, or empty
  mappings and stores valid bindings separately from Web Component properties.
- XState routing now aliases an event only for its exact source node and owner scope. Targeted unit
  evidence proves a nested child activation transitions the intended actor; canonical events remain
  unchanged in the unified stream.
- `prepareUnifoldDocument()` now lowers layout documents before composition expansion and IR
  compilation while retaining the original authored layout for export. A targeted Chromium
  Playwright case dynamically applies a nested layout and proves child event routing to a trusted
  workflow command.
- Layout input now passes both bounded JSON safety validation and the packaged draft-2020-12 schema
  before expansion. Tests cover exact selection, variables/defaults, nested nodes, enum-backed event
  aliases, schema rejection, executable-data rejection, conditions, keyed repetition, duplicate IDs,
  and unresolved or prototype-path references. The compositions package passes 22 files/48 tests.
- Added the standalone hierarchical example and dedicated E2E workspace. Its page JSON now resolves
  a separately reviewed `layouts.json` through the public trusted registry. The adjacent unit test
  passes, its latest production build completes at 177.54 KiB gzip, and all four Chromium/WebKit
  functional plus axe cases pass. The journey proves initial rule projection, selective consent/button updates,
  unchanged name rendering, workflow state, trusted command output, canonical intent/state facts,
  and live Schema.org name publication.
- The example uncovered and now guards an initial-projection defect: `node.patch-properties` changed
  `properties.disabled` without synchronizing common `base.disabled`, so the runtime snapshot and
  native DOM could disagree. Runtime command handling now synchronizes enum/common disabled and
  readonly base state, and dependency routing reports both property and base pointers. Ten targeted
  runtime/example tests pass after the fix.
- Workspace dependency installation and lock update completed. The local AJV payload was incomplete
  after an interrupted offline relink; a forced verified reinstall restored the missing compiled
  files before testing.
- The complete `pnpm quality` gate passes: <=350 physical lines, exact one-to-one adjacent package
  tests, cyclomatic/function-length ESLint rules, all source and strict test typechecks, dependency
  boundaries, and Knip unused-code checks. The complete `pnpm test` run passes 365 Vitest files/929
  tests, 16 tooling tests, 10 generated/script tests, and 22 passing performance correctness files
  with 18 intentional opt-in profile files skipped.
- The full three-engine example command has 4 Chromium/WebKit passes and 2 Firefox failures. Both
  Firefox cases fail inside `browserContext.newPage` before application code runs with the existing
  managed-Windows `_page` defect; the explicit Chromium/WebKit rerun passes 4/4.
- After the final schema and optional Tooltip-registration hardening, package verification passes
  22 files/48 composition tests and 49 files/95 element tests plus 8 generated-manifest tests.
- Authored pointer provenance now survives variable child references and repetition through
  composition lowering into IR diagnostics. Scoped verification passes 23 files/51 composition
  tests, 27 files/93 IR tests, and 35 files/154 coordinator tests.
- A layout-specific application update test and two focused Chromium/WebKit Playwright journeys
  prove exact `/variables/fields/0/type` diagnostics and last-known-good state/DOM retention after an
  invalid hierarchical revision. The reference test waits for its asynchronously loaded optional
  component families before using the E2E update API, eliminating a first-page startup race.
- The complete performance pipeline now exits cleanly and writes schema 2.20.0 evidence with all
  44/44 gates passing. Forty-one samples measure 500-node hierarchical layout compilation at
  6.28/7.28/8.15 ms p50/p95/p99 against the executable 100 ms p95 limit. The long direct profile is
  divided into independently reported core, expensive-scale, compilation, and finalization tests so
  it remains below Vitest's worker-RPC deadline without reducing the 41-sample layout measurement.
- Fresh repository-wide quality passes all file/function/complexity, exact adjacent-test, lint,
  source/test typecheck, 1,620-module/3,542-edge dependency, and unused-code gates. The complete
  correctness command passes 391 package files/984 tests, 16 tooling tests, 10 generated/script
  tests, and 22 performance correctness files/31 tests with 18 opt-in profile files skipped. The
  Tooltip position helper now consumes the catalog `TooltipPlacement` enum instead of exporting a
  duplicate literal-string union.
- Added `createTrustedLayoutDefinitionRegistry()` as the packaged, immutable host capability for up
  to 256 reviewed external definitions. Stateless/cached preparation, synchronous and async mount,
  mounted updates, and governed load-and-mount propagate the same registry. Positive external-only
  resolution, forged/unsafe input, version misses, local/external collisions, exact virtual source
  pointers, and update reuse are covered. Scoped verification passes 24 files/56 composition tests
  and 43 files/167 coordinator tests. Full quality, correctness, and production-build gates pass;
  the registry-backed example passes its unit test and 4/4 Chromium/WebKit E2E cases.
- Final release audit supersedes the intermediate counts above: `pnpm test` passes 392 package files
  and 993 tests, 16 tooling tests, 10 generated/script tests, and 22 performance correctness files/31
  tests with 18 opt-in profiles skipped. Coverage passes at 97.37% lines/statements, 97.00%
  functions, and 90.02% branches without lowering the 90% threshold.
- Benchmark schema 2.20.0 passes 44/44 executable gates. The latest 500-node hierarchical layout
  compilation measures 6.694 ms p95 against 100 ms; the production reference is 184,227 gzip bytes
  with 23,215 deferred gzip bytes.
- The complete browser release command passes 135 reference cases with six intentional scale skips,
  6/6 hierarchical-example cases, 24/24 static-export cases, and 12/12 plain/React/Vue/Svelte host
  cases across Chromium, Firefox, and WebKit. The real upstream JsonUI parity oracle passes 27/27,
  and the external packed-consumer lifecycle passes 3/3.
- A clean reference build exposed and now guards strict XState parameter typing: optional guards are
  omitted instead of emitted as `undefined`, trusted guard implementations have typed parameters,
  and optional-element registration validates tag/catalog metadata even for the same constructor.
- Formatting and duplication thresholds pass. After this checkpoint, resume by auditing the
  remaining priorities in `docs/implementation-status.md`; do not re-open the completed hierarchical
  authoring slice unless a regression is found.

### 2026-08-26 named workflow guard checkpoint (quality verified; Firefox blocked)

- Added optional non-empty `guard` names to the versioned machine transition contract, executable
  JSON Schema, and IR validator. Portable JSON remains data-only.
- Added the public bounded `createMachineGuardRegistry()` host capability. Up to 256 trusted
  synchronous predicates receive the canonical triggering event and a read-only current normalized
  snapshot lookup. Only exact `true` accepts; missing, removed, false, non-true, or throwing
  predicates fail closed without a transition or command.
- XState v5 resolves the guard through a typed `setup()` implementation before registered commands.
  Unknown guard names reject initial mount and dynamic update before mutation; the prior workflow,
  runtime state, and DOM remain last-known-good. Unguarded applications do not instantiate the guard
  registry, preserving tree-shaking and the fixed bundle limit.
- Colocated and public-mount evidence covers accepted/denied state, current cross-node snapshots,
  duplicate and 256-entry limits, unknown and throwing predicates, and invalid-update recovery. The
  external-registry example adds `consent-granted` and adversarially emits a valid activation while
  consent is false before proving the accepted path.
- Fresh `pnpm quality` passes all size/function/complexity, exact adjacent-test, lint, source/test
  typecheck, 1,624-module/3,550-edge dependency, and Knip gates. Fresh core correctness is 392 files/
  993 tests; the complete command also passes 16 tooling, 10 generated/script, and 31 performance
  correctness tests. Fresh coverage passes at 97.37% lines/statements, 97.00% functions, and exactly
  90.00% branches without lowering the threshold. The complete production build passes at 184,227
  bytes (179.91 KiB) for the reference and 177.93 KiB for the example.
- Chromium/WebKit functional and axe journeys pass 4/4. Both current Firefox cases fail in
  `browserContext.newPage` while reading `_page`, before application code; this environment result
  supersedes the earlier transient 6/6 example claim and remains an external release gate.

### 2026-08-26 packed-consumer workflow-guard checkpoint (release verified and committed)

- The clean downstream fixture now imports `createMachineGuardRegistry()` and its context type from
  the packed `@unislang/unifold` facade. Its JSON document declares a named guarded transition, and
  Playwright proves both fail-closed denial for an empty shared control snapshot and acceptance after
  that control changes through the unified runtime stream.
- The fixture uses the intentional load/mount API separation correctly: governed document trust is
  passed as the third argument to `loadAndMountUnifoldApplication()`, while the trusted runtime guard
  capability is passed in the fourth mount-options argument.
- Fixture formatting, cyclomatic-complexity linting, and `git diff --check` pass. The isolated
  tarball pack/install/typecheck/Vite/Playwright consumer command passes 3/3 against the last
  completed package artifacts.
- The final clean `pnpm test:consumer` rebuilds the full workspace and passes all 3/3 isolated
  pack/install/typecheck/Vite/Chromium lifecycle tests. This supersedes the earlier point-in-time
  registry and evolving-manifest failures.
- The checkpoint is committed as `e69e9ff48f3e74239d86622185434cec815f7967`
  (`test: verify packed workflow guard integration`).

### 2026-08-26 bounded Popover checkpoint (release verified and committed)

- `Popover` is the thirty-first catalog-authoritative JSON component. Its exact descriptor requires
  `label`, `panelLabel`, and 1–32 JSON children, accepts the shared logical placement enum, exposes
  reviewed accessibility/privacy/behavior sidecars, and compiles through the ordinary IR node path.
- The deferred `@unislang/unifold/popover` family renders a labeled non-modal dialog, progressively
  uses the native Popover API, focuses the surface, restores trigger focus on Escape, dismisses on
  focus departure/outside input/native close, and emits one canonical activation intent with the
  requested open state. Static HTML degrades to escaped native `details`/`summary` content.
- Reference and static-export JSON exercise real nested Text/Link children. Chromium and WebKit pass
  the focused 2/2 reference journey and all 18/18 static-export cases, including axe,
  invalid-placement rollback/recovery, stable host identity, no-JavaScript disclosure, upgrade, and
  focus restoration. The focused Firefox rerun fails before page creation with the managed Windows
  `_page` runner defect, so it supplies no component behavioral evidence.
- Repository quality passes file/function/complexity, one-to-one tests, lint, source/test typecheck,
  1,652-module/3,633-edge dependency analysis, and Knip. Correctness passes 400 package files/1,010
  tests, 16 tooling tests, 10 generated/script tests, and 24 performance files/34 tests with 18
  opt-in profiles skipped. Coverage passes at 97.38% lines/statements, 97.02% functions, and 90.01%
  branches. Formatting and the 1.56% duplication threshold pass.
- The production build passes with 184,037 initial gzip bytes (179.72 KiB) against the unchanged
  184,320-byte gate and 25,417 deferred gzip bytes. The Popover/reference chunk is 2.04 KiB gzip.
  Clean packed-consumer verification passes 3/3.
- Benchmark schema 2.21.0 passes 45/45 executable gates. Twenty samples render exactly 434 buttons;
  32-action Popover opening is 0.70/1.15/5.03 ms p50/p95/p99 against 100 ms, and the combined
  workflow startup is 77.19/100.41/104.22 ms against 1,000 ms.
- Next locally actionable architecture work remains the Phase 2 component inventory: choose the next
  overlay/navigation family only after applying any comparative native/Lion/Spectrum prerequisite
  recorded in `docs/implementation-status.md`. Production identity/storage provisioning remains an
  external integration prerequisite rather than local substitute work.
- The checkpoint is committed as `d9ed981508ed0f28e1f536084f8d92837161c941`
  (`feat: add catalog-authoritative popover`).

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

### 2026-08-26 bounded Combobox checkpoint

The catalog-authoritative select-only Combobox slice is implemented, validated, committed as
`668562b`, pushed to `origin/main`, and independently verified at
`668562ba83f82aae51a78b1707c1d1302983ddbf`:

- `Combobox` now flows from the shared contract and catalog descriptor/sidecar through IR control
  classification, composition export validation, element registration, DOM rendering, runtime
  events, form aggregates/reset, hydration capture, and native-select static fallback. Scalar choice
  fallback now preserves an explicit empty value rather than allowing the browser to select the
  first option silently.
- The editable ARIA combobox keeps query, popup, and active-descendant state interaction-local. It
  commits only registered selections or an explicit empty clear, skips disabled options, supports
  Arrow/Home/End/Enter/Escape and pointer operation, restores canonical labels on dismissal/blur,
  escapes labels, announces no-results status, and exposes full set position/size metadata.
- Broad result rendering and keyboard navigation are capped at 200 options while filtering all
  10,000 authored options. The schema-2.18.0 benchmark report passes 41/41 gates; the new twenty-sample
  filter gate measured 1.42/2.18/3.50 ms p50/p95/p99 against 100 ms p95 and observed exactly 200
  rendered options against the 200-option ceiling. Correctness filtering selects distant
  `item-09999` without promoting query text to canonical state.
- Full quality, source/test typecheck, dependency, unused-code, formatting, duplication, diff,
  production build, and packed-consumer gates pass. The package matrix is 338 files/873 tests,
  performance correctness is 30 tests, coverage is 97.31% lines and 90.09% branches, and the clean
  packed consumer passes 3/3 after its pinned dependencies are installed with network access.
- The complete reference matrix passes 81 Chromium/WebKit cases with 3 intentional scale skips.
  Focused unit/browser coverage proves keyboard and pointer selection, disabled skipping, local
  unmatched queries, Escape, clear, blur, runtime event identity/snapshot semantics, selective DOM
  projection, reset/submit aggregation, static export, hydration, and axe accessibility. Focused
  Firefox cases again fail before page creation with the managed Windows `_page` runner defect, so
  they provide no component behavioral result and remain an external release gate.
- The production reference closure measures 181,632 gzip bytes (177.38 KiB) against the unchanged
  executable 180 KiB ceiling. The next interaction-family slice should start with a bounded,
  catalog-authoritative Tabs contract (or the adjacent Menu/Dialog family if the architecture audit
  establishes a stronger dependency), retaining the same JSON-to-static/hydrated/runtime evidence
  and adding a representative benchmark only where scale or interaction latency is material.

### 2026-08-26 bounded MenuButton checkpoint

The catalog-authoritative MenuButton slice is implemented, fully validated, committed as `33fb53e`,
pushed to `origin/main`, and independently verified at
`33fb53e8fb2c813d6a00dd4ae3a16d519e667a76`:

- `MenuButton` and its 1-to-100 exact action-item contract flow through the shared component enum,
  catalog descriptor and accessibility sidecar, catalog-derived IR validation, generated component
  definitions and custom-elements manifest, registration, runtime rendering, and documentation.
- `unifold-menu-button` implements the ARIA menu-button pattern with disabled trigger semantics,
  registered menuitem identities, cyclic Arrow navigation, Home/End, Escape and Tab behavior,
  outside-pointer dismissal, trigger-focus restoration, and one canonical
  `ComponentActivated { itemId }` event with the exact stable component snapshot.
- Static export emits a useful native `details`/`summary`/list/button fallback, preserves escaped
  hostile text and disabled items, and upgrades to the interactive component without creating a
  second state authority. Reference JSON and browser journeys cover rejection/recovery, stable host
  identity, keyboard and pointer activation, canonical event provenance, and axe accessibility.
- Full quality and test validation passes: 346 Vitest files/892 tests, 16 tooling tests, 8 generated
  component-manifest tests, 1 theme test, 1 reference-script test, and 30 performance correctness
  tests with 18 explicitly skipped profile cases. Coverage is 97.37% lines/statements, 97.18%
  functions, and 90.15% branches.
- The complete Chromium/WebKit reference matrix passes 85 cases with 3 intentional scale skips; the
  Chromium/WebKit static-export matrix passes 14/14. Firefox fails before page creation with the
  pre-existing managed Windows `browserContext.newPage` `_page` defect, so a repaired runner must
  still supply that browser's release evidence.
- The complete build and clean packed-consumer 3/3 lifecycle pass. The reference JavaScript closure
  is 184,298 gzip bytes (179.98 KiB) against the executable 180 KiB limit. Repository formatting and
  the 1.46% duplication threshold pass.
- Fresh schema-2.20.0 benchmark evidence passes 43/43 gates. The exact 100-step/100-panel/100-item
  fixture renders 401 buttons; startup is 49.34/68.10/73.31 ms p50/p95/p99 against 1,000 ms p95,
  and MenuButton activation is 0.79/1.29/1.84 ms against 100 ms p95.
- Next, reconcile the remaining overlay/navigation inventory before selecting Tooltip, Popover, or
  Dialog; retain the architecture's comparative native/Lion/Spectrum evidence gate before Dialog.

## Immediate resume procedure

1. Read this file, `docs/layout-authoring.md`, `docs/implementation-status.md`, and
   `docs/architecture.md`; preserve the hierarchy distinction between authored trees and normalized
   execution IR.
2. Inspect `git status --short --branch` and preserve any post-checkpoint user changes.
3. Confirm local `HEAD` and `refs/heads/main` from `git ls-remote origin` match. If the remote does
   not contain `d0200123b041602efe910527915e70e2b024c948`, push `main` before implementing another
   slice. After any code change, rerun `pnpm.CMD quality`, `pnpm.CMD test`, and
   `pnpm.CMD test:coverage`, then inspect `git diff --check` before committing.
   Re-run dedicated Firefox journeys only on a working runner; do not treat the current pre-page
   failure as behavioral evidence.
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

The remaining architecture slices in `docs/implementation-status.md` are still open. After each
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
contradicted. Known external release gates (intermittent managed Firefox-runner reliability,
license/scope selection, production infrastructure, and manual accessibility/security evidence)
must remain explicit and cannot be silently waived. The current slice has complete Chromium/WebKit
behavioral evidence; rerun Firefox when the managed runner can create a page reliably.

## Session log

- 2026-08-26: Completed the local native-form value-shape and form-structure slice. One generic
  `ElementInternals` lifecycle controller now serves scalar, boolean, repeated-string, and file
  codecs; Checkbox, MultiSelect, and FileInput preserve native successful-control semantics while
  canonical state remains JSON-only. Added deferred Field, Fieldset, and ErrorSummary catalog,
  validation, element, static, reference, browser, and performance paths. The full quality gate
  passes the 350-line, 30-line-function, complexity-below-4, exact 1:1 colocation, lint, source/test
  typecheck, 1,805-module/4,019-edge dependency, and unused-code policies. Correctness passes 442
  files/1,105 tests, tooling 16/16, generated scripts 10/10, performance correctness 28 files/38
  tests, and coverage at 97.49/97.01/90.06% lines-functions-branches. Benchmark schema 2.25.0
  passes 50/50; native forms measure 0.81 ms p95 against 8 ms and ErrorSummary 1.51 ms against 100
  ms. The bounded reference matrix passes 168 with six intentional scale skips; static export
  39/39, hierarchical example 9/9, JSONUI parity 27/27, host parity 12/12, and packed consumer 3/3
  pass. Production initial JavaScript is 183,882 gzip bytes with 35,959 post-mount bytes; the 438-byte
  initial headroom is a tracked risk. Duplication is 1.59%; format and diff checks pass. The slice
  is committed as `33d80faf35b6ccd85d12b68e93c66db4bcd07032`, pushed to `unifold`, and
  independently verified at remote `main`.

- 2026-08-26: Completed the local implementation and serialized validation of the bounded FileInput,
  native scalar form association, deferred optional definitions, and deterministic readiness slice.
  The privacy contract is exactly `{ id, size, type }`; the trusted upload boundary resolves only
  ephemeral handles by opaque ID. Late definitions replay current properties, event snapshot,
  runtime context, and children without weakening rollback/disposal or accepting foreign classes.
  Full correctness passes 428 files/1,079 tests. Coverage is 97.42/97.01/90.09%
  lines-functions-branches. Static export passes 36/36 and the full reference matrix passes 153
  cases across Chromium, Firefox, and WebKit with six intentional non-Chromium scale skips.
  Benchmark schema 2.23.0 passes 48/48: FileInput is 0.24 ms p95 against 100 ms and the 20-cycle
  lifecycle grows 1.04% against 2%. The production initial closure passes at 184,278 gzip bytes
  (179.96 KiB) with 32,840 post-mount bytes. Final quality passes over 1,751 modules/3,859
  dependencies; formatting and the 1.54%/5% duplication gate pass; host parity passes 4/4 in
  Chromium; and the clean packed-consumer passes 3/3. Root-generated `.tmp` worktrees are excluded
  from line and duplication scans so benchmark baselines cannot corrupt repository evidence.
  Implementation checkpoint `2a59294b2a877eb458e391fbbee175a2481c8da3` is pushed and independently
  verified at `origin/main`; this documentation checkpoint records the resumable handoff.

- 2026-08-26: Updated this resumable record from fresh evidence. Native form lifecycle Playwright
  passes 6/6 across Chromium, Firefox, and WebKit; 13 focused FileInput/form files pass 28 tests; the
  complete quality gate passes with 1,747 modules and 3,847 dependency edges; and the production
  reference startup passes at 183,934 gzip bytes with 32,254 post-mount bytes. Fixed catalog-default
  projection so an unauthored FileInput value initializes as `[]`, and removed a top-level-await
  cycle that prevented deferred component definitions from resolving after mount. The FileInput
  browser journey now reaches selection and canonical-event assertions but its page-wide axe check
  exposes missing property replay on a pre-definition Tooltip. FileInput's serialized `name` and
  `lastModified` also violate the architecture's opaque-ID metadata rule. Both defects and the full
  release matrix remain explicitly open; the working tree is not checkpointed.

- 2026-08-26: Reconciled the post-checkpoint Dialog and bundle audits. Dialog keyboard handling now
  ignores closed dialogs, nested fallback Escape stays within the inner dialog, composed focus
  discovery excludes hidden/inert/`aria-hidden`/CSS-hidden ancestors, and the helper satisfies the
  cyclomatic-complexity ceiling. The focused suite passes 10/10 tests. Required profile validation
  is now statically included before mount; optional component registrations begin only after mount.
  The fresh production build passes at 181,906 gzip bytes (177.64 KiB) with 30,502 gzip bytes
  reported separately as post-mount families, and the bundle-checker unit test passes. Repository
  lint passes. Global quality/typecheck is currently red because a concurrently started FileInput
  scaffold has not yet added all exhaustive catalog/IR mappings; those shared edits were preserved.
  The startup/focus audit changes and FileInput scaffold remain uncommitted.

- 2026-08-26: Implemented and locally release-verified the catalog-authoritative Breadcrumb and
  Dialog slice across contracts, catalog/sidecars, IR, deferred Lit elements, canonical events,
  static fallbacks, package subpaths, reference and hierarchical examples, manifests, browser
  journeys, and performance fixtures. Added authored Schema.org BreadcrumbList/ListItem/WebPage
  publication support and documented the OSS/native-semantics decision with primary-source research.
  Full quality, 417-file/1,045-test correctness, 97.43% line/90.09% branch coverage, production
  build at 179.39 KiB initial gzip, packed-consumer 3/3, duplication, and formatting gates pass.
  The full Chromium/WebKit reference matrix passes 95 cases with 3 intentional WebKit scale skips,
  hierarchical example 6/6, static export 22/22, and real-upstream JsonUI parity 18/18. Firefox
  remains blocked before page creation by the managed runner's `_page` defect. The latest benchmark
  report passes schema 2.22.0 at 47/47 gates: Breadcrumb activation is 0.77 ms p95 and Dialog opening
  is 0.45 ms p95. The separate native/Lion/Spectrum Dialog foundation comparison also passes its
  100 ms/4,096-byte native gate at 0.19 ms p95 and 347 gzip bytes.
  The implementation is committed as `d0200123b041602efe910527915e70e2b024c948`; this progress
  checkpoint records the exact resume and remote-verification procedure.

- 2026-08-26: Completed and release-verified the catalog-authoritative Popover slice across the
  component contract, shared catalog-property descriptors, IR, deferred Web Component, canonical
  activation event, static fallback, public facade, reference/static integrations, generated
  manifests, accessibility/rollback journeys, and schema-2.21.0 performance gates. The final
  Chromium/WebKit focused browser matrices pass 2/2 and 18/18; the Firefox attempt fails before page
  creation with the managed runner defect. Quality, 400-file/1,010-test correctness, 90.01% branch
  coverage, full build/bundle, 45/45 benchmark, duplication, formatting, and clean packed-consumer
  3/3 gates pass. The implementation, consumer, and progress commits are pushed to `unifold`; the
  remote SHA was independently confirmed before this final status-only correction.

- 2026-08-26: Implemented and quality-hardened hierarchical layout authoring, enum-backed per-node
  event aliases, catalog/IR validation, exact XState source routing, bounded/schema-validated
  lowering, conditions, and stable-key repetition. Added a standalone hierarchical Vite example
  covering derived rules, selective projection, XState commands, the unified event stream, and
  Schema.org publication. Full quality and 365-file/929-test correctness suites pass; example
  Chromium/WebKit functional plus axe evidence passes 4/4, while Firefox remains blocked before
  page creation by the managed runner defect.

- 2026-08-26: Closed the local hierarchical acceptance gaps for authored JSON Pointer provenance,
  last-known-good invalid-update recovery, and measured compilation performance. Scoped
  composition/IR/coordinator suites pass; focused Chromium/WebKit update journeys pass 4/4; and the
  regenerated schema-2.20.0 report passes 44/44 gates with the 500-node layout at 7.28 ms p95/100
  ms. Fresh full quality and 389-file/959-test package correctness pass. This checkpoint left the
  explicit trusted external registry boundary as the next gap; the following entry closes it.

- 2026-08-26: Implemented the trusted external layout registry as a bounded immutable host
  capability with no runtime I/O, exact version/collision rejection, virtual registry provenance,
  and propagation across cached preparation, sync/async mount, update, and governed load-and-mount.
  Moved the standalone example's reviewed layout into that registry so its real mount and Playwright
  path exercise the external boundary. Full quality passes over 1,620 modules/3,542 dependencies;
  the complete correctness command passes 391 package files/984 tests, 16 tooling tests, 10
  generated/script tests, and 31 performance correctness tests. The full build passes at 179.72 KiB
  for the reference initial closure and 177.54 KiB for the example; example Chromium/WebKit passes
  4/4. Two overlong test callbacks uncovered during the final gate were split without changing
  production behavior, restoring the enforced 30-line function ceiling.

- 2026-08-26: Implemented trusted named XState guards end to end across machine contracts/schema,
  IR, a bounded fail-closed host registry, current normalized snapshot access, sync/async mount
  propagation, last-known-good updates, public exports, documentation, and the external-layout
  example. Full quality, 392-file/993-test correctness, 97.37% line/90.00% branch coverage,
  performance correctness, and production build pass; the unchanged reference ceiling passes at
  179.91 KiB. Chromium/WebKit example behavior plus axe passes 4/4. The latest Firefox rerun fails before page creation with the managed Windows
  `_page` defect, superseding the earlier transient 6/6 result without supplying application
  behavioral evidence.

- 2026-08-26: Extended the clean packed-consumer fixture to prove the public workflow-guard API from
  installed tarballs. Its browser journey denies an empty-name transition, accepts the same event
  after the shared control snapshot changes, and passes the isolated consumer lifecycle 3/3.
  Formatting and scoped complexity lint pass. A new unrelated Popover slice appeared and continued
  changing in the shared worktree during verification; a point-in-time manifest failure and the need
  for a stable full rerun are recorded above without modifying or discarding that work.

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
- 2026-08-26: Implemented the bounded select-only Combobox end to end, including catalog/IR,
  interactive and static rendering, hydration, form/runtime integration, accessibility, a capped
  10,000-option workload, and complete reference journeys. Full quality, 338-file/873-test package
  coverage, 41/41 benchmark, coverage, build/bundle, Chromium/WebKit, and clean-consumer gates pass;
  Firefox remains the known external pre-page runner limitation. Committed as `668562b`, pushed to
  `https://github.com/unislang/unifold.git`, and independently verified remote `main` at
  `668562ba83f82aae51a78b1707c1d1302983ddbf`.
- 2026-08-26: Implemented catalog-authoritative `Tabs` end to end with a bounded exact tab/panel
  contract, tab-specific IR diagnostics, horizontal/vertical wrapping roving focus, disabled-tab
  skipping, automatic/manual activation, canonical input/blur events, stable authored panel
  identities, static export, validated hydration, reference JSON, rejection/recovery, selective
  updates, and axe evidence. Full quality, 340-file/881-test package and coverage suites, build,
  formatting, duplication, packed-consumer 3/3, schema-2.19.0 benchmark 42/42, and Chromium/WebKit
  reference 83-pass/3-intentional-skip matrices pass. The 100-panel Tabs selection measured
  1.59/4.14/5.07 ms p50/p95/p99 against its 100 ms p95 gate, and the production reference bundle
  is 179.04 KiB gzip against 180 KiB. Firefox again failed before page creation with the managed
  runner's `browserContext.newPage` `_page` defect, so it produced no behavioral result. Committed
  the implementation as `bf095d1` (`bf095d13af46f6c0115355467006900059062618`). Next resume by
  reconciling the open inventory in `docs/implementation-status.md`, then selecting the next
  catalog-authoritative interaction family with its prerequisite boundaries and the same complete
  contract/IR/runtime/static/browser/benchmark evidence path.
- 2026-08-26: Implemented the bounded catalog-authoritative `MenuButton` end to end across contract,
  catalog, IR, custom element, canonical events, static fallback/upgrade, reference JSON, browser,
  and performance evidence. Full quality, 346-file/892-test package and coverage suites, build,
  clean packed-consumer 3/3, schema-2.20.0 benchmark 43/43, reference Chromium/WebKit
  85-pass/3-intentional-skip, and static Chromium/WebKit 14/14 matrices pass. The 100-item action
  measured 0.79/1.29/1.84 ms p50/p95/p99, and the production reference remains under its executable
  ceiling at 179.98 KiB gzip. The implementation is committed as `33fb53e`, pushed to
  `https://github.com/unislang/unifold.git`, and independently verified at the full SHA above;
  Firefox remains the known external pre-page runner limitation.
- 2026-08-26: Implemented the catalog-authoritative `Card`/`Image` content-media pair across exact
  safe-URL/dimension/child contracts, catalog/sidecars, IR, deferred elements/facade subpaths,
  native static export and upgrade, generated definition evidence, and the real Scratch-compatible
  hierarchical JSON example. Focused correctness passes 225 files/608 tests plus 8 generated tests;
  the schema-2.26.0 benchmark passes 51/51 with 100 pairs at 3.57 ms p95/100 ms. The production
  reference passes at 184,204/184,320 gzip bytes and the example's pair is a separate 0.98 kB gzip
  chunk. Chromium/WebKit pass all new and existing applicable hierarchical/static cases; Firefox is
  globally blocked before page creation by the current runner. The implementation is committed as
  `5e15efd478c2249be198aa93e7c5f93d526e71f6`, pushed to
  `https://github.com/unislang/unifold.git`, and independently verified at `refs/heads/main`. Resume
  by preserving the concurrent AI/Studio worktree, reconciling its separate quality failures after
  that workstream settles, then selecting one of the seven remaining catalog gaps from
  `docs/implementation-status.md`.
