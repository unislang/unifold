# Implementation status

Unifold has implemented the architecture plan's named 45-component stable catalog plus the
`Composition` structural host. The repository proves the critical runtime seams and one governed
Studio workflow; it is not yet the multi-user, provisioned, manually audited enterprise product
described by the complete 1.0 plan.

## Implemented

- A pnpm monorepo with strict TypeScript, ESLint, Prettier, Knip, dependency-cruiser, jscpd,
  Changesets, and executable file/function/complexity policies.
- Independent application runtimes with no implicit singleton and a bounded public observation
  seam. Explicit application/tenant authorization is reevaluated per event, disclosure remains
  classification-aware, and the read-only observation surface cannot issue commands or resolve
  snapshots. Unit, Studio-browser, and 10-runtime performance evidence cover duplicate IDs,
  streams, stores, actors, effects, telemetry, disposal, and fail-closed observation.
- A safe JSON document contract, validation diagnostics, normalized immutable IR, and a minimal
  JsonUI-compatible profile for Accordion, Alert, AuditLog, Box, Breadcrumb, Button, Checkbox, CheckboxGroup, Combobox,
  Card, Composition, DataGrid, DateField, Dialog, ErrorSummary, Field, Fieldset, FileInput, Form, Grid, Heading, Icon, Image, Link, MasterDetail, MenuButton, MultiSelect,
  NumberField, Pagination, Popover, RadioGroup, SearchField, SearchResults, Select, Stack, Stepper, Switch, Tabs, Table, Text, TextArea, TextField,
  Toast, Tooltip, VirtualList, and Wizard. Catalog-backed property validation rejects unknown properties, invalid enum values,
  malformed option, table, or audit lists, invalid string-array values, duplicate option values, duplicate
  table column/row or audit-entry identities, undeclared table cells, and selections absent from their declared
  options before rendering. Reusable enum-backed catalog constraint descriptors keep cross-property
  policy out of component-name conditionals.
- A bounded native `FileInput` whose JSON value is metadata-only. Catalog and IR validation enforce
  exact opaque UUID, byte-size, and MIME keys, unique IDs, the 32-file ceiling, MIME/extension
  acceptance, and an authored per-file byte ceiling. Names and modification times never enter the
  portable contract. Browser `File` handles remain ephemeral behind exact-ID
  `resolveSelectedFile()` for trusted upload adapters and are cleared on rollback or disconnect;
  static export never serializes metadata or bytes and restored metadata truthfully requires
  reselection.
- Native form interoperability through one reusable generic Lit controller over `ElementInternals`.
  TextField, TextArea, NumberField, DateField, Select, RadioGroup, VirtualList, Checkbox, MultiSelect, Switch, and FileInput
  participate in native ownership and `FormData`, disabled fieldsets, reset/state restoration, and
  validity while the Unifold runtime remains the only committed state authority. Scalar controls
  add IME de-duplication; boolean, repeated-string, and file codecs preserve native submission
  semantics without admitting live file handles into canonical state or events.
- A deferred native `NumberField` with finite `number | null` canonical state, positive step and
  optional range constraints enforced by catalog/IR compilation, the shared form graph, native
  validity, static hydration, and browser admission. The Scratch-style `variables.fields` example
  authors its `type`/`props`/`events` shape and routes a numeric `onInput` value through the unified
  event fabric and XState owner scope.
- A deferred native `SearchField` with required labeling, enum-backed autocomplete, and a shared
  configurable query limit capped at 2,048 characters. IR compilation, SearchResults, native input
  ingress, static export, and hydration enforce the same bound; oversized or wrong-type input fails
  closed. Its Scratch-style hierarchy routes string input and Enter submission through the unified
  stream, native form owner, and XState scope in Chromium, Firefox, and WebKit.
- A deferred native `Switch` with a required accessible label, boolean canonical value, and one
  native checkbox carrying `role="switch"`. It reuses the boolean form adapter for native checked
  submission, required validity, disabled ownership, reset, and browser restoration while emitting
  canonical input and blur intents through the unified stream. Its Scratch-style `type`/`props`/
  `events` shape lowers through the ordinary compiler; static export preserves public state and
  hydration rejects mismatched role, type, name, disabled, or required semantics while deliberately
  migrating the native checked state so a pre-upgrade user edit is not lost.
- A deferred native `DateField` with `""` or exact Gregorian `YYYY-MM-DD` canonical state and no
  timezone conversion. One shared contract rejects impossible dates, reversed/out-of-range values,
  invalid whole-day steps, and implicit multi-day step anchors across catalog, IR, native validity,
  static export, and hydration. The Scratch-style example routes input/blur through the unified
  stream and native form owner; disabled/readonly synthetic input is restored without emission.
- A deferred persistent `Toast` with bounded required label/message text, enum-backed status and
  visual variant, atomic polite/assertive live semantics, optional manual dismissal, and no timer
  API. Its Scratch-style activated binding enters the unified stream, an XState transition projects
  `visible: false`, and a renderer-backed focus request recovers to a stable action without updating
  unrelated hosts. Static output remains visible without JavaScript and guarded hydration rejects
  semantic or text drift.
- A deferred explicit `Pagination` navigation with a required landmark label and authored ordered
  items. Enum-backed page/previous/next/overflow kinds, unique stable identities, safe links,
  exactly one enabled current page, directional edge ordering, and noninteractive disabled/overflow
  entries are compiler invariants. The component renders native list/link/button semantics, emits
  stable activation intent without owning current state, and leaves page-window calculation to the
  application or data actor. Static output preserves safe links, converts href-less actions to
  noninteractive text, and admits upgrade only after exact selector-safe structural validation.
- Deferred `Card` and `Image` content/media primitives. `Card` preserves 1 to 100 authored children
  inside a native article; `Image` requires deliberate alternative text, a catalog-safe relative or
  HTTP(S) resource URL, and positive intrinsic dimensions. Both lower from the Scratch-compatible
  `type`/`props`/`children` authoring shape, render statically without JavaScript, upgrade without
  duplication, and remain outside the initial production closure.
- Strict custom-element preflight remains the default. Trusted hosts may opt into enum-backed
  `AllowPending` mounting for catalog-known deferred families. Compatible late definitions replay
  the latest properties, event snapshot, runtime context, and child container after synchronous
  mount; removed, replaced, disposed, and foreign-definition cases fail closed. The reference then
  commits its post-mount JSON augmentation through the ordinary application-update boundary.
- A required, dependency-isolated `@unislang/unifold-jsonui` compiler profile pinned to upstream
  `@jsonui/core`/`@jsonui/react` 0.10.25 commit
  `5401b3d4900ca3032c108d6db00e8a819f4b28e9`; its complete feature corpus, stable-ID extension,
  grammar-aware unsupported diagnostics, cycle/depth/node/diagnostic budgets, exact JSON Pointers,
  schema/enum agreement test, and IR provenance field prevent silent dialect drift or a second store.
  A test-only real-upstream parity workspace pins package integrity and source revision, verifies
  copied-fixture SHA-256 provenance, and compares supported trees against the Unifold IR in Chromium,
  Firefox, and WebKit. A behavioral case additionally compares binding and touched-validation
  outcomes and verifies Unifold's exact redacted canonical event chain in Chromium, Firefox, and
  WebKit. Its
  measured isolated production-profile cost is 5.88 kB minified/1.76 kB
  gzip. The current startup closure is 162,117 gzip bytes (158.32 KiB) against the executable 190
  KiB Phase 1 budget. Composition and semantic validation now share the already-required
  `json-schema-library` engine instead of statically shipping a second AJV engine. The module
  artifact, reference validator adapter, and reviewed runtime options
  load before mount as explicit deferred resources; optional families and diagnostic event output
  load after mount, and all deferred chunks are audited together.
- Typed `UiStoreDefinition` contracts and a Unifold `store`/`path` profile extension. The compiler
  validates unique definitions, enum-backed policy, embedded local-only Draft 2020-12 schemas,
  byte quotas, schema pointers, and catalog value types into immutable IR bindings. Trusted
  synchronous adapters are preflighted before mount, validate bounded initial data, project
  classification and read-only state, and receive changed committed values through typed post-commit
  `store.write` effects. An opt-in parallel async session adds fail-closed privileged sink
  authorization, cancellation, exact trusted migration edges, revision/idempotency-based optimistic
  commits carrying the complete validated candidate, external subscriptions, and explicit
  reject/external-wins arbitration. Independent bounded memory and injected atomic key/value CAS
  adapters pass one shared load/commit/replay/conflict/subscription/disposal conformance suite. The
  opt-in async application mount connects every session atomically before render, serializes writes
  against current revisions, settles canonical effects asynchronously, rolls failed optimistic
  values back, and projects validated external snapshots through one write-suppressed runtime
  transaction. Chromium/WebKit and deterministic 1,000-operation fixtures cover the lifecycle.
- Deterministic reusable JSON composition expansion with exact version pins, scalar structural
  parameters, declared slots, nested instances, namespaced IDs, typed exports, versioned manifests,
  per-node provenance, runtime composition handles, and diagnostics.
- A strict `UiModule@1.0.0` contract and static resolver for source files that remain below the
  authored file limit. The resolver accepts only a host-constructed in-memory registry, verifies
  exact semantic versions and RFC 8785 SHA-256 import integrity, rejects duplicate modules,
  namespaces, resources, missing imports, cycles, unsafe or unbounded JSON, and undeclared
  composition references, and performs no fetch or package loading. It deterministically
  namespaces imported compositions/resources and expands selected documents through the ordinary
  layout and composition engines. Layout resources let reviewed modules supply Scratch-style
  definitions without a parallel TypeScript registry; lowered nodes retain exact pointers to the
  defining resource template or root-document variable. One canonical artifact integrity covers
  the composed and expanded documents, resolved graph, resources, and source map; locks separately
  pin prepared IR. The packaged CLI validates, flattens, and checks bounded local module projects.
  The primary reference, hierarchical example, and both Studio surfaces resolve authored module
  graphs before mount, and their production/E2E builds reuse `unifold module check` to reject drift
  from committed locks. Studio keeps independent control-surface and live-application locks. CLI
  tests prove deterministic flattened artifact/lock bytes and IR/hash parity, while the clean packed
  starter consumes the flattened artifact through unit, typecheck, production-build, and Chromium
  checks. This closes criterion 33's repository-controlled proof; final release reruns remain.
- A hierarchy-oriented authoring layer compatible with the original Angular prototype's useful
  shape: exact `layoutType`/`layoutVersion`, typed `variables`, recursively nested
  `type`/`props`/`children`, safe structural references, boolean conditions, durable-key repetition,
  and named component events lower into the canonical JsonUI/composition compiler path. A packaged
  draft-2020-12 schema and bounded JSON-safety pass reject malformed, cyclic, shared, executable,
  over-depth, over-count, oversized-string, non-finite, and prototype-key input before lowering.
  Enum-backed source-specific bindings are validated against catalog event capabilities and alias
  only XState input; canonical stream facts are not rewritten. The standalone hierarchical example
  passes unit, build, selective-update, workflow, Schema.org, canonical-stream, and axe checks in
  Chromium and WebKit. Imported enum-backed `layout` resources and a bounded immutable host-supplied
  registry support reviewed definitions without document-selected URLs or runtime I/O; exact
  version collisions, forged registry objects, unsafe definitions, source provenance,
  mounted/async updates, and signed-load mounting fail closed or pass through the same compiler
  boundary. Invalid revisions retain last-known-good state and DOM, and 500-node layout compilation
  has an executable p95 regression gate.
- CloudEvents-shaped canonical UI events with node identity, correlation, causation, transaction,
  sequence, state revision, and classification-aware disclosure. Public ordinary facts may carry
  complete snapshots and changes; non-public and store-write facts retain source identity with
  metadata-only payloads.
- A private RxJS ingress, public read-only event stream, transactional Immer node store,
  source/scope indexes, coherent form/group/record/array aggregates, selectors, XState actor/effect
  adapters, and selective changed-node projection. Node-indexed selections, incremental ancestor
  aggregation, and changed-owner validation routing have deterministic 1k/10k correctness tests and
  an environment-tagged Vitest benchmark harness.
- A closed `controls@1.0.0` topology separates visual and logical edges through
  contracts, IR, snapshots, normalized storage, submit/reset, rules, disclosure, and live
  `runtime.control<T>()` handles. The locked hierarchical example and current Chromium/WebKit journey
  prove
  nested values through unrelated wrappers, logical event scope, XState, flat/repeated native
  `FormData`, submit/reset, schema.org, selective projection, and axe. Composition contract `2.0.0`
  adds namespaced self-contained form topologies and caller-mounted reusable fragments through one
  merged authority; focused compiler tests cover nested, slotted, repeated, and invalid mounts.
  Logical aggregate disable cascading now preserves separate own/effective intent, cancels stale
  validation, and has 10k plus Chromium native-form evidence. Named Scratch repeats now compile
  bounded authored collection authority coupled to explicit logical Array/Record controls. The
  previous full Chromium reference pass and current focused Chromium/WebKit 2/2 rerun include mounted
  insert/move/remove/rejection, exact authored/rendered ordering, retained dirty value, stable host
  and surviving focus, causal structural metadata, and zero late events from a non-cooperative
  validator after its control is removed. Frozen mounted runtime/renderer capabilities deny raw
  structural mutation, while trusted host correlation/causation remains outside authored JSON.
  Schema 2.36.0 gates 500-item initial/revision compilation. Focused-member removal now transfers to
  the next or previous member through one post-commit canonical focus effect with Chromium/WebKit
  and nested composed-control evidence. An optional validated `emptyFocusTarget` now transfers final
  removal to a distinct stable focus-capable authored node and preserves structural-to-focus causal
  lineage in Chromium/WebKit. Post-runtime renderer rollback/event atomicity, end-to-end authored-collection mutation
  performance, exact composition-control provenance/migration shape, a rendered composition mount,
  wrapper-refactor identity/focus/rollback, and schema-derived handle types remain incomplete.
- A versioned data-only workflow-machine contract compiled to live XState v5 actors, scope-indexed
  canonical event routing, trusted typed-command factories, causal runtime transactions,
  bounded trusted named guards over canonical events and current normalized snapshots, fail-closed
  predicate execution, last-known-good implementation validation, actor retention across unchanged
  reconciliation, and synchronous state inspection.
- A closed, allowlisted JSON Logic derived-rule profile with declared state dependencies, expression
  budgets, cycle and multiple-writer diagnostics, a compiled dependency DAG, typed state-command
  outputs, and incremental transitive evaluation. Its deterministic reference graph evaluates
  exactly 25 affected rules out of 1,000 and records direct p50/p95/p99 timing evidence.
- Stateless registered validation with a built-in required rule, a Standard Schema adapter,
  enum-backed input/blur/submit update triggers, atomic touched/status/error aggregation, accessible
  field and form-summary projection, explicit reset and disable commands, disabled-value omission,
  heterogeneous aggregates, synchronous object-level cross-field validation with affected-node
  metadata, canonical invalid/submitted/reset form facts, and registered asynchronous rules backed
  by cancellable XState actors, authoritative request identities, stale-result guards, and canonical
  started/completed/cancelled/failed facts. Registry-normalized error ownership and a transactional
  `affectedIds` routing index selectively project aggregate-owned issues onto unchanged controls
  without duplicating ownership.
- Keyed DOM subtree reconciliation that preserves unrelated host/focus identity, completes removed
  indexed selections, and clears XState ownership for removed node lifetimes. A dedicated Chromium
  scale journey proves exact mutation, all-host identity, shadow-input focus, event order, and a
  one-node commit at both 1,000 and 10,000 rendered nodes.
- A supported `@unislang/unifold` application coordinator with explicit element registration,
  compiler and renderer preflight, one-command structural reconciliation, compatible control-state
  migration, dynamic composition handles, and last-known-good rejection or compensation.
- An enum-pinned `unifold-core@1.0.0` document/catalog boundary and all-tag custom-element registry
  preflight. Exact duplicate releases register idempotently; foreign, malformed, mismatched, aliased,
  differently versioned, or unavailable realm definitions reject before runtime/render creation.
  Native repeat-mount and incompatible-iframe behavior passes Chromium, Firefox, and WebKit. The
  clean-consumer gate also creates two physical copies from the packed element artifact, proves
  distinct component constructors with one shared Lit runtime, accepts the exact release, rejects a
  different release in an iframe without partial registration, and mounts the packed facade after it.
- A Vercel AI SDK 7 provider-model boundary with schema-constrained patch proposals, RFC 8785 base
  fingerprints, RFC 6902 operations, stable-path and revision policy, risk enums, approval gating,
  compiler validation, and commit through the normal application coordinator. Provider context is
  built from the generated `ComponentDefinitionDocument`, verifies exact catalog identity, is
  byte/count bounded, rejects unknown components, and recursively omits sidecar-declared sensitive
  properties. Framework-derived path/value risk can raise but never lower the model declaration, so
  behavior, data, semantics, resource, and external-effect changes cannot self-label as presentation.
  Proposal values have iterative byte/depth/value/string/prototype-key safety limits, existing stable
  IDs survive ancestor patches, approved proposals can create the optional Schema.org root, and
  enum-backed compiler/accessibility/static-export checks execute before acceptance. A synchronous
  final base comparison prevents an async evaluation from overwriting a same-thread live edit.
- A governed server generation path verifies strict canonical Ed25519 provider manifests, routes
  only server-owned aliases through the AI SDK provider registry, rechecks validity/retirement on
  every resolution, and denies `never-export` data. Exact BigInt micro-USD costing, a trusted
  provider-specific upper-bound estimator, atomic tenant/user/request budget reservation and
  settlement, bounded identity/trace inputs, explicit token/retry/timeout/cancellation controls,
  normalized-usage enforcement, and redacted receipts tied to the verified manifest fail closed
  around provider I/O. The arbitrary-model generator remains a documented low-level adapter rather
  than the production path.
- A browser-safe `@unislang/unifold-studio` XState session boundary for natural-language request,
  complete proposal evaluation, deterministic diff, isolated disposable preview, explicit approval,
  exact-base revalidation, atomic apply, and portable/static export. Superseded and cancelled results
  cannot replace the current candidate. The provider generator is separated from the evaluation-only
  browser subpath, and a build gate rejects generator/credential markers while holding the dedicated
  Studio JavaScript to 250 KiB gzip (currently 240.60 KiB). The JSON-authored dogfood example uses
  a clearly labelled deterministic proposal producer with the real policy/compiler evaluator; its
  request/preview/apply/export, keyboard, axe, Schema.org static output, and browser-boundary journeys
  pass 24/24 in Chromium, Firefox, and WebKit. Negative journeys prove unsafe proposals cannot open
  or mutate preview/live applications, stale apply cannot overwrite an external edit, cancelled or
  superseded work cannot install a late candidate, and export failure cannot produce a partial
  artifact or mutate live state. Preview input is an explicit allowlist that excludes
  host effects, guards, validators, renderer callbacks, and stores; stale bases fail before preview
  or apply, failed evaluations dispose preview, and lifecycle updates use a polite live region.
- Browser-safe portable JSON and static HTML exporters. Static HTML covers all forty-six core
  components with native no-JavaScript content, deterministic upgrade markers, public-data-only
  values, exactly one script-safe JSON-LD graph, and a versioned SHA-256 integrity manifest.
- A versioned detached Ed25519 document envelope and JSON Schema, browser-safe signing helper, and
  untrusted text loader that enforces byte limits, verifies exact payload bytes before parsing,
  resolves only host-trusted keys, applies defensively cloned bounded migrations, records provenance,
  and enters the existing composition/IR compiler. Missing keys, tampering, invalid JSON, duplicate
  or missing migration edges, cycles, budget exhaustion, exceptions, invalid outputs, and ordinary
  compiler rejection fail without partial IR.
- An optional governed document-provenance policy resolves trusted issuer and active/revoked key
  state before verification, adds exact payload SHA-256 evidence, records metadata-only acceptance
  or denial through a host audit port, validates bounded canonical receipts, and fails closed on
  resolver, metadata, revocation, audit, or receipt failure without leaking provider details. Its
  exact five-sample performance fixture passes 1,000 accepted loads at 236.73 ms p95 against 5,000
  ms and 1,000 revoked denials at 42.58 ms against 1,000 ms, with one audited receipt per operation.
- A published current compatibility matrix distinguishing private package placeholders from durable
  JSON/protocol versions. Unsupported versions reject exactly; the generic document migration engine
  now also rejects non-JSON, cyclic, and post-migration outputs over the one-megabyte document limit.
  No fabricated pre-1.0 document edge is shipped because no predecessor contract exists.
- A versioned `@unislang/unifold-control-plane` server seam with a Draft 2020-12 request schema,
  trusted session-derived actor/tenant context, deny-by-default capability and object grants,
  server-assigned optimistic revisions, tenant-key isolation and quotas, registered effect
  idempotency leases with success/failure replay, redacted audit metadata, resumable tenant
  sequences with explicit gap detection, and SHA-256-verified backup/restore. Infrastructure stays
  behind replaceable ports; the bundled in-memory adapter is conformance evidence, not production
  identity or storage. Framework-neutral Fetch host/client adapters enforce the exact operation
  shapes, one-megabyte request/four-megabyte response defaults, safe JSON and UTF-8 bounds, stable
  status mapping, cancellation, and redacted failures. A resumable cursor advances only across a
  validated contiguous tenant batch, retains its position on gaps, and requires explicit reset after
  authoritative reread. Exact 1,000-read and 1,000-message fixtures pass 95.78/6.01 ms p95 against
  2,000/500 ms gates. A bounded durable-outbox port and independent SQLite store add `STRICT`
  tenant-keyed tables, atomic revision/effect/audit/realtime/outbox transactions, lease/ack/retry/
  expiry semantics, storage-layer rollback injection, and one shared alternate-adapter conformance
  suite. Exact 1,000-commit and 1,000-message SQLite fixtures pass 97.81/30.66 ms p95 against
  2,000/500 ms gates. An official-client-compatible OpenFGA adapter pins the model and exact
  tenant-scoped tuple, while an OpenTelemetry service wrapper exports only allowlisted trace and
  low-cardinality metric attributes. Optional Fetch admission proves exact Origin, cookie/body
  session binding, CSRF, expiry, revocation, duplicate-cookie, and unsafe-method rejection.
  AES-256-GCM external recovery accepts deployment-owned key/vault/checkpoint ports and advances
  last-known-good only after an isolated SQLite scratch restore; its exact 1,000-document gate
  passes 40.70 ms p95 against 2,000 ms.
- A versioned `@unislang/unifold-collaboration` protocol and in-memory conformance service with a
  closed Draft 2020-12 request schema, separately trusted tenant/actor/capability context,
  server-sequenced immutable revisions, idempotent proposals, conservative disjoint-path rebasing,
  structured conflicts, protected branches, assigned distinct reviewers, expiring exact-revision
  approvals, comments, exact-head publication, compensating undo, bounded resumable tenant events,
  and deeply immutable ephemeral presence. The control-plane adapter intersects trusted session
  capabilities with exact-resource grants. An exact 1,000-commit/1,000-revision-rebase fixture
  passes 60.40/4.20 ms p95 against 1,000/100 ms gates with 98.30% line, 91.53% branch, and 98%
  function coverage.
- A bounded `@unislang/unifold-devtools` inspection package over the authoritative runtime: exact
  event/transaction eviction evidence, correlation/causation/transaction/scope filters, normalized
  node picking, classification-aware metadata projection, SHA-256 fingerprinted RFC 6902 document
  diffs, a closed replay-plan schema, and strictly validated data-only replay with no effect
  execution. Its exact 10,000-event/500-node fixture passes 44.26/0.30 ms p95 against 1,000/100 ms
  gates while proving 9,000 exact evictions and zero restricted snapshots.
- A versioned `@unislang/unifold-data` query/mutation seam with an exact Draft 2020-12 envelope,
  trusted registered-operation boundary, bounded TanStack Query Core cache, cursor/sort/filter keys,
  retention and LRU limits, offline last-known-good reads, cancellation and stale-result rejection,
  safe bounded retry, timeout abort, optimistic commit/rollback, revision-conflict results, and
  cross-context tag invalidation. The same contract runs as an XState promise actor and is exported
  through the supported facade; identity, authorization, endpoints, and durable persistence remain
  trusted adapter concerns.
- Accessible Lit Web Components, including native-backed checkbox and switch, radio group, select, text-area,
  multi-select, and accordion controls; a bounded editable ARIA Combobox with select-only canonical
  value semantics; plus token-backed Box, Stack, and Grid structural primitives;
  escaped Text, native Heading, live-region Alert, and safe native Link content primitives; a
  pinned Lucide-backed accessible Icon allowlist; a bounded ARIA-listbox VirtualList for large
  collections; a bounded native Table with escaped scalar cells; a controlled native DataGrid with
  sorting and selection; a virtualized, responsive MasterDetail with escaped scalar fields; a
  controlled virtualized SearchResults with native search semantics and safe result URLs; shared
  bounded Stepper and Tabs navigation, a composed Wizard with stable authored panels, and a bounded
  ARIA MenuButton with registered action identifiers; a bounded interactive Popover with authored
  JSON children, focus restoration, native top-layer enhancement, and static disclosure fallback; a read-only,
  virtualized AuditLog with native list/time semantics; a Tailwind theme foundation;
  component metadata; a DOM renderer; and a JSON-defined reference form.
- An experimental full-catalog `ComponentDefinition` pipeline for all forty-six core elements. The
  official Custom Elements Manifest analyzer and schema derive and validate element API facts;
  enum-backed catalog sidecars supply behavior, accessibility, privacy, structured semantics,
  complete examples, and test evidence. The package publishes standard CEM and joined definition
  artifacts with generated authoring, attribute, public-snapshot, and control schemas. Cross-source
  and live-event drift checks prove every catalog property is exposed and represented exactly in
  canonical snapshots.
- The complete 15-component Phase 1 foundation release group, plus Card, Composition, Combobox, MultiSelect, NumberField, Pagination, SearchField, Switch, DateField, Toast,
  Accordion, VirtualList, Table, DataGrid, MasterDetail, SearchResults, Stepper, Tabs, MenuButton,
  Popover, Dialog, Breadcrumb, Tooltip, Wizard, AuditLog, Field, Fieldset, ErrorSummary, and Image components exercised by later
  interaction slices.
- A pinned Schema.org 30.0 semantic graph contract carried through the typed document and IR,
  with public/visible committed-state bindings, typed composition-export bindings, an allowlisted
  starter vocabulary, deterministic script-safe JSON-LD, framework-owned mount/update/transaction/
  disposal publication, last-known-good refresh, an executable JSON Schema, and browser parity.
  Independent application owner IDs now coexist in one head while updates and disposal affect only
  their own script; duplicate target-owner scripts and invalid refreshes fail without disturbing
  another application's last-known-good graph.
- Validated static-DOM upgrade mode that migrates public native control values and focus into the
  single normalized runtime before replacement, atomically adopts the exact exporter-owned JSON-LD
  publication, rejects structural, choice, missing, duplicate, or foreign-owner tampering without
  mutating the fallback, and never creates a second state authority.
- A dedicated standalone-export Playwright fixture that keeps generated HTML byte-exact and loads
  its upgrade bundle separately, covering no-JavaScript content, manifest integrity, state/focus
  migration, semantic ownership, exactly-once canonical events, and tamper rollback in the shared
  Chromium, Firefox, and WebKit project matrix.
- A plain DOM, React 19, Vue 3, and Svelte 5 host-parity matrix over the same public facade and JSON
  document. It proves framework property assignment, dashed custom events, default slots, identical
  canonical transactions, single state ownership, retained focus/element identity across shell
  rerenders, and teardown. The Chromium clean-consumer run installs the matrix from packed Unifold
  tarballs outside the repository; the shared browser matrix also runs it in Chromium, Firefox, and
  WebKit.
- Public testkit and Playwright packages with semantic scenarios, event assertions, selective
  update assertions, axe-core checks, keyboard journeys, and Chromium/Firefox/WebKit projects.
- Positive, negative, lifecycle, rollback, disposal, effect-failure, shadow-DOM, accessibility,
  aggregate-state, event-identity, and harness tests exceeding the 90%
  package-source coverage gate.
- Exactly colocated unit tests across package, application, and example `src`/`scripts` trees, with
  one test file per non-exempt source module. Exceptions are exact-path, reasoned, and rejected when
  stale; cross-package integration and Playwright E2E behavior remain in dedicated suites.
- A repository source-ownership gate that rejects importing a local binding and re-exporting that
  binding from a feature module. Public package export maps remain the deliberate re-export
  boundary; feature modules expose behavior they own.
- Strict test-project typechecking for every colocated package suite in addition to Vitest runtime
  execution.
- A computed seventeen-package clean-consumer proof that rejects workspace leakage and broken package
  artifacts, then typechecks, bundles, mounts, updates, and disposes the packed public facade in
  Chromium outside the monorepo.
- A first `@unislang/unifold-cli` adopter surface with structured `validate` and `generate starter`
  results. Validation calls the public compiler; generation refuses overwrite/path escape and emits
  an ordinary hierarchical Vite project with an accessible form, unified event observation, XState
  command, Schema.org graph, CSP/theme setup, strict TypeScript, colocated unit test, and Playwright
  accessibility/selective-update journey. `migrate`, `test`, `export`, and `doctor` remain planned.
- Package, architecture, onboarding, testing, and example documentation using public exports.

## Next architecture slices

1. Provision the completed OpenFGA, OpenTelemetry, admission, encrypted-recovery, outbox, and SQLite
   seams in a production-like environment. Retain evidence for live model/store credentials,
   telemetry export, external failure-domain vault and key rotation, scheduled drill alerts,
   session revocation propagation, and chosen RPO/RTO. Promotion of the current Node SQLite adapter
   also requires explicit acceptance of its experimental runtime API or a supported driver
   implementing the same conformance contract.
2. Provision the completed async store boundary against production connectors. The framework seam
   now includes loading, external subscriptions, migrations, conflict policy, privileged sink
   authorization, two-adapter conformance, mounted-runtime integration, browser lifecycle evidence,
   and exact 1,000-operation gates without weakening normalized UI-state ownership. Production
   promotion still requires connector credentials, offline/retry policy, and operational evidence.
3. Completed locally: governed issuer/revocation/audit document provenance and a real-upstream
   binding/validation plus redacted canonical-event behavioral oracle are executable. No fabricated
   profile migration is published because `unifold-jsonui@1.0.0` still has no successor; the first
   successor must add its reviewed edge and golden/recovery fixtures in the same release.
4. Composition hardening now has reversible canonical identity encoding, exact bounded and acyclic
   definition-version migration edges, reset-by-default state policy, compatible public-export
   preservation, DOM-focus migration, exact-snapshot rollback, and failed-compensation quarantine.
   Complete 500-instance and one-instance-revision compilation are independently gated at 100 ms
   p95; the schema-2.18.0 run measured 9.32 ms and 9.02 ms, so subtree caching is deferred pending
   evidence. The dedicated preservation/reset/rejection/recovery journey passes state, focus,
   semantics, stable DOM identity, canonical event, and axe assertions in Chromium, Firefox, and
   WebKit. The select-only Combobox
   path is now catalog-authoritative from JSON through static/interactive rendering, runtime events,
   reset, keyboard, axe, and bounded 10k-option filtering evidence. Tabs and MenuButton are now
   catalog-authoritative through static/interactive rendering, controlled or registered-action
   events, focus, axe, rollback, and exact 100-item gates. Popover, Dialog, and Breadcrumb are
   likewise catalog-authoritative
   through bounded nested JSON, static disclosure, native enhancement, canonical activation,
   Chromium/WebKit accessibility/rollback evidence, exact 32-action/position gates, native/static
   fallbacks, and Schema.org BreadcrumbList/ListItem support. The focused Breadcrumb/Dialog
   reference journeys pass in Chromium and WebKit. Managed Firefox fails before page creation with
   the runner's existing `_page` defect, so it provides no application evidence for this slice. Continue with
   free-form autocomplete variants, menu variants, overlays, navigation, upload, and variable-height or
   two-dimensional virtualization while retaining all three browsers as release gates. See
   [composition P0 follow-ups](./compositions.md#p0-hardening-follow-ups).
5. Add stable-release evidence and generated documentation/test skeletons to the complete core
   `ComponentDefinition` pipeline, then benchmark representative native/Lion/Spectrum patterns
   before choosing adapters for the complex component families.
6. Expand Schema.org release-generated vocabulary and publication profiles, freshness and source
   provenance, optional explicit graph aggregation, static sidecars, and optional verified RDFa or
   Microdata adapters. Per-application JSON-LD ownership isolation is complete; whole-runtime
   multi-tenant browser isolation remains an acceptance gap.
7. Expand the guarded AI/Studio boundary with approved failover, partial-progress streaming that
   never mutates a candidate, executable natural-language outcome assertions, durable actor
   approvals/audit, collaboration branches, conflict/rebase, undo, and adversarial real-provider
   evals. Signed provider capability manifests, token/cost/time budgets, compiler/accessibility/
   static-export checks, and the bounded single-user request-to-export path are complete.
8. Expand the JSON-authored Studio dogfood UI into visual panes for canvas highlighting,
   schema/property editing, behavior graphs, accessibility evidence, responsive previews,
   collaboration, and embeddable/source-workspace export formats.
9. Add the optional Angular forms bridge and any measured thin framework adapters, then expand
   SSR/declarative shadow DOM, localization, RTL, design-token interchange, security hardening,
   observability, persistence, offline, and enterprise deployment. Plain DOM, React, Vue, and Svelte
   host neutrality is now executable without framework-specific state adapters.
10. Expand the initial flat workflow profile beyond its implemented trusted named guards with delays,
    invoked effect actors, nested/parallel states, inspection subscriptions, portable replay records,
    and versioned snapshot migration or safe-discard policy.

## Open release and verification gates

- The 350-line check applies to authored non-Markdown files. It explicitly and narrowly excludes the
  generated pnpm lockfile, which remains committed for reproducibility and supply-chain review.
- Chromium, Firefox, and WebKit complete on the current Windows runner when browser subprocesses run
  outside the filesystem sandbox. CI must retain all three engines rather than waiving that release
  evidence.
- All packages are intentionally private until the project license is selected and ownership of the
  `@unislang` npm scope is verified.
- The packed-tarball gate proves artifact integrity without weakening that private boundary. After
  license and scope approval, add an ephemeral-registry facade-only install plus npm/Yarn parity,
  package-lint, provenance, SBOM, and license-inventory gates.
- The control-plane now has memory and SQLite implementations, atomic database/outbox rollback
  evidence, concurrent idempotency and delivery reservation cases, OpenFGA/OpenTelemetry mappings,
  encrypted external envelopes with scheduled-callable SQLite scratch drills, and transport-level
  session/CSRF admission. Production release still requires provisioned live-service evidence,
  failure-domain vault/key custody, scheduler/alert evidence, durable revocation propagation, and
  either explicit acceptance of Node's experimental SQLite API or a supported database driver
  passing the same suite.
- The store seam proves synchronous host adapter loading and post-commit draft writes in unit and
  mount tests. Writes are authorized against the current node binding, validated as a complete
  candidate store, bounded by schema/quota policy, and protected from prototype-sensitive pointers.
  Source/persistence enums do not automatically select connectors. The opt-in async seam now proves
  authorized load/commit/subscription, executed trusted migrations, optimistic conflicts, bounded
  idempotency, cancellation, external-update policy, and a second CAS adapter through one conformance
  suite. The async mount now proves atomic pre-render connection, serialized canonical effect
  settlement, optional-store first revision, failed-write compensation, external reprojection with
  no write echo, and disposal in unit plus Chromium/WebKit journeys. Richer merge policy, async query
  state, dynamic privileged reconnection, and cross-system rollback remain release gates. Memory and injected versioned Web Storage
  adapters exercise the synchronous replacement
  boundary; Chromium and WebKit cover hydration, write-through, dynamic rebinding, selective DOM
  identity, and pre-render adapter rejection. The default runtime stream applies
  classification-aware public-safe disclosure.
- Client-side validation and application coordination contribute materially to the reference bundle.
  The current startup closure is 162,117 gzip bytes (158.32 KiB) and remains below the executable
  190 KiB gate. Consolidating composition and semantic Draft 2020-12 validation onto the existing
  `json-schema-library` removed 77 duplicate AJV/fast-uri modules from the static closure while
  preserving exact diagnostic mapping and explicit unsafe-key/prototype rejection. The resolved
  module artifact, reference-specific validator adapter, and reviewed
  runtime options load through explicit pre-mount resources; optional component families and
  diagnostic event output load after mount, and combined deferred JavaScript is audited at 84,979
  gzip bytes. Preserve the `/validation` boundary and evaluate schema
  precompilation, build-time validation, or an explicit lazy authoring/compiler boundary before
  setting production bundle budgets.
- Valid dynamic option replacement, declarative dependency scheduling, localization, configurable
  serialization, and nested array/group reset need broader positive, negative, cancellation, and
  recovery journeys before the controls can be considered production-complete. Invalid duplicate
  option replacement and subsequent valid-update recovery are covered by the browser matrix.
- The 10k node-store timing, exact wake-up/aggregate-validation, direct p50/p95/p99, forced-GC heap
  sentinel, Chromium DOM/focus/interaction-latency proofs, and the real 1,000-rule dependency DAG are
  implemented. The rule graph proves exactly 25 affected evaluations and measures 0.04 ms p95 on the
  current workstation, below the provisional 4 ms target. A combined public-runtime fixture proves
  a 100-control edit, leaf/group/form synchronous validation, two ancestor aggregates, 20 transitive
  rule commands, committed-revision selector delivery, and zero unrelated notification in one
  transaction; its measured 1.35 ms p95 is below the provisional 8 ms target. A paired 10k profile
  isolates the overhead of 2,000 indexed selections at 0.86 ms p95, below the provisional 2 ms
  limit. Canonical intent normalization and owning-actor delivery measure 0.0021 ms p95 with
  exactly-once critical-category evidence, below the provisional 8 ms limit. The public compiler
  boundary has a bounded, mutation-isolated LRU cache: schema-valid 500-node cold and cached paths
  measure 1.60 and 1.48 ms p95 against 50 and 16 ms limits, while full 2,000-node validation and
  normalization measures 6.30 ms p95 against its 200 ms off-interaction-path limit. After five
  cache-registration warm-ups, twenty public 500-node mount/revision/dispose cycles retain 548,240
  bytes, or 1.04% over the forced-GC baseline, below the strict 2% lifecycle limit. A schema-valid 10,000-option
  Combobox filters in 2.18 ms p95 and renders exactly 200 options against 100 ms and 200-option
  gates. A schema-valid 10,000-option VirtualList starts in 22.68 ms p95 and renders at most 23 rows against 1,000 ms and 200-row gates,
  while Chromium proves distant-window focus, selection, and runtime commit behavior. The
  schema-valid 1,000-row native Table starts in 96.47 ms p95 against 1,000 ms and renders exactly
  1,000 body rows in every sample; Chromium and WebKit prove native semantics, escaped hostile text,
  last-known-good rejection, identity retention, and recovery. The native DataGrid starts in 138.41
  ms p95, sorts in 24.45 ms p95, and selects in 20.90 ms p95 with exact 1,000-row and state checks;
  Chromium and WebKit prove canonical state, focus, accessibility, rollback, and recovery. All
  10,000-row MasterDetail startup and selection measure 50.81 and 6.22 ms p95, render at most 23
  master options, and pass Chromium/WebKit focus, reflow, accessibility, privacy, rollback, and
  recovery evidence. The 10,000-result SearchResults startup, query, and selection measure 50.17,
  5.50, and 4.89 ms p95, render at most 15 options, and pass Chromium/WebKit search/listbox,
  canonical-state, accessibility, privacy, rollback, and recovery evidence. The shared
  Breadcrumb/Stepper/Wizard/Tabs/MenuButton/Popover/Dialog workload starts in 127.78 ms p95, activates
  Breadcrumb and the final Stepper, Wizard, and Tabs entries in 0.77/4.37/5.33/4.78 ms p95, invokes
  the final declared menu item and restores trigger focus in 5.23 ms p95, and opens the 32-action
  Popover and Dialog in 4.43/0.45 ms p95. It renders exactly 468 buttons and passes Chromium/WebKit
  focus, completion, canonical action, accessibility, rollback, host identity, and child-panel
  identity evidence; Firefox is blocked before page creation by the managed runner defect. The
  10,000-entry AuditLog starts in 68.65 ms p95, scrolls to the exact distant
  window in 1.04 ms p95, renders at most 15 entries, and passes Chromium/WebKit list/time semantics,
  focus, accessibility, privacy, precise duplicate-ID rollback, recovery, and host-identity evidence.
  The 1,000-key data-source actor resolves the full cached set in 7.39 ms p95 with zero post-warm
  adapter calls and invalidates the exact tagged set in 0.81 ms p95; focused tests cover registered
  operations, paging/cache identity, retention, offline recovery, retries, conflicts, optimistic
  rollback, cross-context notifications, cancellation, timeout abort, and stale completion.
  The metadata-only 32-file selection profile measures 0.24 ms p95 against 100 ms, retains exactly
  32 ephemeral handles, and proves file bytes never enter canonical JSON. The exact
  100-Card/100-Image projection profile
  updates all alternative text across 50 samples and measures 3.57 ms p95 against 100 ms while
  requiring exact host counts. The exact 100-SearchField projection measures 0.59/1.38/4.66 ms
  p50/p95/p99 across 50 samples against its 100 ms p95 limit. All fifty-three timing and lifecycle limits are executable benchmark
  gates. Ratification still requires a provisioned,
  versioned mid-tier runner.
  Full-document 10k structural reconciliation remains materially slower than leaf and bulk
  transactions. See [performance evidence](./performance.md).
