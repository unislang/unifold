# `@unislang/unifold`

The supported convenience entry point for mounting and dynamically updating a Unifold application.
It owns the complete authored JSON → composition expansion → IR compilation → normalized runtime →
keyed DOM renderer path without introducing a second state authority.

```ts
import { UnifoldApplicationMountStatus, mountUnifoldApplication } from "@unislang/unifold";

const result = mountUnifoldApplication(authoredJson, container);
if (result.status === UnifoldApplicationMountStatus.Mounted) {
  const application = result.application;
  const update = application.update(revisedAuthoredJson);
  application.dispose();
}
```

Updates are admitted only after composition and IR validation plus renderer preflight. A single
coordinated `structure.reconcile` transaction migrates compatible dirty control state. Its candidate
revision, selections, rules, bindings, composition manifest, actors, DOM, and Schema.org graph stay
private until every structural surface accepts the update. Commit then publishes canonical facts in
sequence order before effects and validation. Machine replacement has explicit prepare, activate,
commit, and discard phases; actor ownership is checkpointed before activation, and obsolete actor
shutdown cannot invalidate an accepted replacement. Rejection restores the exact prior revision and
emits no candidate or compensation facts; failed rollback quarantines the application and publishes
only the normal disposal fact. Reentrant transactions observed during the outbox drain are projected
selectively and refresh Schema.org state rather than being mistaken for the already-projected
structural revision.

An authored document may declare `controls@1.0.0` independently from its hierarchical visual tree.
Enum-backed Form, Group, Array, Record, and Control definitions target stable rendered IDs and carry
logical parents, ordered children, and durable keys into IR/runtime snapshots. The current authoring
boundary is document-global; composition-local topology namespacing and rendered structural
collection edits remain future acceptance work.

For static HTML produced by `@unislang/unifold-export`, select
`mountMode: UnifoldApplicationMountMode.UpgradeStatic`. The coordinator validates the complete
document/node/component hierarchy before mutation, captures only supported native value controls,
uses trusted store adapters as authority for bound controls, migrates unbound values as pristine
initial state, and restores focus after the Lit hosts settle. Automatic semantic publication also
requires exactly one exporter-owned JSON-LD block, validates its document owner before rendering,
and atomically transfers ownership to the mounted application. Structural, semantic-owner, missing,
or duplicate-publication tampering rejects while preserving the original node identities, edited
values, focus, and semantic block. Ordinary mounts default to
`UnifoldApplicationMountMode.Replace`.

Typed `semantics` travel through the document and IR. Publication defaults to
`UnifoldSemanticPublicationMode.Automatic`: mount emits one owned JSON-LD graph, committed runtime
changes refresh it from the same snapshots, invalid dynamic data retains the last-known-good graph,
updates participate in rollback, and disposal removes it. Secondary applications sharing a
document can explicitly select `Disabled`; competing publication owners reject.

The application exposes the current compiled `document` plus restricted `runtime` and `renderer`
capabilities for integration and diagnostics. The mounted runtime retains public events, snapshots,
selectors, handles, actors, and ordinary UI commands, but rejects collection/structure commands;
use authored `update()` or `applyCollectionOperation()` for structural change. The renderer exposes
element lookup only. Import `@unislang/unifold-runtime` explicitly when building a headless engine
that intentionally owns raw structural primitives. Its `authored` getter returns a defensive copy
suitable for deterministic export.
Call `dispose()` at the host lifecycle boundary. Updates must retain the document
ID; use a new application mount for a different document. Renderer, semantic, and workflow failures
return their exact diagnostic stage without exposing a partially committed update.

Mount always calls the idempotent `defineUnifoldElements()` boundary before creating the runtime or
renderer. The authored catalog is pinned to the enum-backed `unifold-core@1.0.0` contract. A realm
with foreign, malformed, or differently versioned `unifold-*` registrations returns an
`element-registration` diagnostic at `/catalog`; it does not partially register or render the
application. Incompatible catalog releases require independent iframe/document realms.

Larger component families are deferred from the baseline entry and must be registered before a
document that references them is mounted. Supported subpaths are `audit-log`, `breadcrumb`,
`checkbox-group`, `combobox`, `content-media`, `data-grid`, `date-field`, `dialog`, `file-input`,
`form-structure`, `master-detail`, `menu-button`, `number-field`, `pagination`, `popover`, `search-field`,
`search-results`, `stepper`, `switch`, `tabs`, `toast`, `tooltip`, `virtual-list`, and `wizard`; each
exports its matching `defineUnifold*()` function. This keeps the
reference application's initial executable bundle below its enforced 190 KiB-gzip ceiling while
preserving the same catalog and registration checks.

Strict mounting remains the default. A host that intentionally loads reviewed optional families
after the first render may set `elementDefinitionPolicy: ElementDefinitionPolicy.AllowPending`.
Unifold then mounts only missing catalog-known tags, requests the replay adapter after the
synchronous mount, and replays each host's latest properties, event snapshot, runtime context, and
child container when the compatible definition arrives. Removed, replaced, disposed, and foreign
definitions are ignored or rejected by identity and catalog-marker checks. This policy is a trusted
host delivery capability, not permission for document-selected modules or arbitrary registry
mutation.

Persist and export authored JSON, not normalized IR. IR, generated composition IDs, and runtime
snapshots are derived execution artifacts. The coordinator currently recompiles the full candidate
document; subtree compilation is reserved for a measured performance optimization.

Named layout repeats must target one explicit logical Array or Record control. Call
`applyCollectionOperation(operation, origin?)` with enum-backed insert/move/remove operations;
`origin` may carry trusted host `correlationId` and `causationId` values, but authored JSON cannot
provide them and cannot select a transaction ID.
An optional `emptyFocusTarget` lowers to the closed public `collectionBehaviors@1.0.0` contract and
canonical IR `collectionBehaviorsById`. Final-member focus selection consumes that IR policy; the
private prepared collection map remains the only authority for editing authored variables.

`mountUnifoldApplication` also mounts document-declared workflow machines when the host supplies a
`UiMachineCommandRegistry` and, for guarded transitions, a `UiMachineGuardRegistry`. Trusted guards
receive the canonical event and read-only current runtime snapshots; false or thrown results deny the
transition. Invalid or unknown command/guard references reject before mutation, and
`machineState(id)` exposes synchronous workflow inspection without copying UI values into XState.

Remote or governed documents should enter through asynchronous `loadAndMountUnifoldApplication()`
rather than through a pre-parsed object. The loader enforces a byte budget, optionally requires a detached
Ed25519 signature, verifies the original payload before JSON parsing, applies only host-registered
bounded migrations, and then calls the same preparation/compiler boundary. A governed
`provenancePolicy` additionally resolves trusted issuer/revocation metadata, fingerprints exact
payload bytes, emits metadata-only load evidence, and requires a validated audit receipt before
acceptance. Unsigned loading must be selected explicitly for trusted local authoring. See
[document trust and migrations](../../docs/document-trust.md).

Hosts can provide trusted `storeAdapters` at mount. Unifold validates each adapter's version and
bounded initial value before rendering, hydrates schema-compatible bound controls, and routes
changed committed values back as post-commit writes. `createMemoryStoreAdapter()` supports tests and
prototypes. `createWebStorageStoreAdapter(storage, key, version)` provides a second synchronous
adapter over an injected `Storage`-like port, so hosts may explicitly select `localStorage`,
`sessionStorage`, or a test double without the package reading browser globals. It stores a versioned
JSON envelope and applies the same safe JSON Pointer writes as the memory adapter. See
[Stores and control bindings](../../docs/stores-and-bindings.md) for policy, classification, failure
semantics, and current limitations.

For external persistence, `connectAsyncStore()` establishes a separately authorized async session
without changing synchronous mount behavior. It supports exact trusted migration edges,
revision/idempotency-based commits, cancellation, validated subscriptions, and explicit
`reject-concurrent` or `external-wins` policy. `createAsyncMemoryStoreAdapter()` and
`createAsyncKeyValueStoreAdapter()` pass the same conformance suite; the latter uses an injected
atomic compare-and-set port and bounded versioned JSON envelopes. `mountUnifoldApplicationAsync()`
connects all declared sessions before render, serializes commits, compensates failed optimistic
values, and projects validated external snapshots without write echoes.

The bubbling DOM `unifold-event` is a trusted, value-bearing ingress message. Subscribe to
`application.runtime.events$` for classification-aware public-safe facts: non-public data and every
derived store write retain source identity and causality without copying values or snapshots. See
[runtime event disclosure](../../docs/event-disclosure.md).
