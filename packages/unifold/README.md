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
`structure.reconcile` transaction migrates compatible dirty control state and atomically replaces the
composition manifest. Rejected inputs retain the last-known-good document, state, and DOM.

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

The application exposes the current compiled `document`, `runtime`, and `renderer` for integration
and diagnostics. Its `authored` getter returns a defensive copy suitable for deterministic export.
Call `dispose()` at the host lifecycle boundary. Updates must retain the document
ID; use a new application mount for a different document. A post-commit renderer exception triggers
a compensating reconcile to the previous prepared document and returns a renderer-stage diagnostic.

Mount always calls the idempotent `defineUnifoldElements()` boundary before creating the runtime or
renderer. The authored catalog is pinned to the enum-backed `unifold-core@1.0.0` contract. A realm
with foreign, malformed, or differently versioned `unifold-*` registrations returns an
`element-registration` diagnostic at `/catalog`; it does not partially register or render the
application. Incompatible catalog releases require independent iframe/document realms.

Persist and export authored JSON, not normalized IR. IR, generated composition IDs, and runtime
snapshots are derived execution artifacts. The coordinator currently recompiles the full candidate
document; subtree compilation is reserved for a measured performance optimization.

`mountUnifoldApplication` also mounts document-declared workflow machines when the host supplies a
`UiMachineCommandRegistry`. Invalid or unknown command references reject before mutation, and
`machineState(id)` exposes synchronous workflow inspection without copying UI values into XState.

Remote or governed documents should enter through asynchronous `loadAndMountUnifoldApplication()`
rather than through a pre-parsed object. The loader enforces a byte budget, optionally requires a detached
Ed25519 signature, verifies the original payload before JSON parsing, applies only host-registered
bounded migrations, and then calls the same preparation/compiler boundary. Unsigned loading must be
selected explicitly for trusted local authoring. See
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
atomic compare-and-set port and bounded versioned JSON envelopes. Automatic projection of these
sessions into a mounted application is still a release gate.

The bubbling DOM `unifold-event` is a trusted, value-bearing ingress message. Subscribe to
`application.runtime.events$` for classification-aware public-safe facts: non-public data and every
derived store write retain source identity and causality without copying values or snapshots. See
[runtime event disclosure](../../docs/event-disclosure.md).
