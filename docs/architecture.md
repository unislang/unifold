# Architecture

Unifold is a framework-neutral UI runtime. JSON is the portable source, the normalized node graph is the single state authority, and public event facts join components, forms, pages, applications, actors, tooling, and tests.

```text
Hierarchical layout JSON or canonical JsonUI tree
    │ validate and expand compositions
    ▼
Expanded JSON UI document
    │ compile and validate
    ▼
Normalized immutable IR
    │ instantiate
    ▼
Web Components ── trusted DOM intent ──► Application coordinator
    ▲                                      │
    │ selective projection                 │ typed commands
    │                                      ▼
    └────────────────────── Normalized transactional store
                                             │ public-safe facts
                                             ▼
                                     canonical event fabric
                                             │
                                             ▼
                                     XState actors and effects
```

## Ownership rules

- Web Components own presentation and native interaction mechanics, not application truth.
- The normalized store owns committed node state and transaction revisions.
- Declared domain stores remain behind trusted host adapters. Their values enter and leave through
  validated ports; controls never subscribe to or mutate those stores directly.
- Form/group/record/array values and statuses are derived transactionally from child controls; form
  elements do not maintain a second value map.
- XState actors own workflow decisions and invoke registered effects by name.
- RxJS supplies observable delivery and indexed subscriptions; it is not a second store.
- JSON definitions contain data and registered identifiers, never arbitrary executable code.
- Angular, React, Vue, and Svelte integrate through adapters over the same contracts.

## Composition authoring boundary

Versioned JSON compositions provide structural parameters, declared slots, and typed selection,
event, and command exports. Expansion is deterministic and happens before IR compilation, so
composed and directly authored controls share one renderer, state authority, event fabric, semantic
binding model, and test contract. A versioned manifest preserves instance and per-node authored
provenance through IR and snapshots. Expanded IDs namespace template and slot nodes beneath the
instance ID using a versioned, reversible segment codec. Exact one-to-one manifest aliases migrate
compatible state from pre-codec identities atomically; consumers integrate through
`runtime.composition(instanceId)` export aliases.

The authored document remains the editable and exportable source; expanded JSON is a derived compiler input. See [Reusable JSON compositions](./compositions.md) for the current contract and its P0 hardening gates.

## Static UiModule boundary

Large applications may split reviewed JSON into exact-versioned `UiModule@1.0.0` sources. A trusted
host constructs the module registry from local or package-owned data; a module document cannot name
a URL, resolver callback, package, or latest version. Every import pins module ID, version,
SHA-256 integrity, and a local namespace. Resolution is bounded, deterministic, and I/O-free; it
rejects malformed or unsafe sources, duplicate registrations and namespaces, missing imports,
integrity mismatches, cycles, undeclared composition namespace references, and aggregate graph or
resource limits.

Imported composition definitions, `layout` resources, and nested `$compose` references receive
deterministic namespace paths before the ordinary layout and composition expanders run. Layout
resources are declarative reviewed definitions, not executable callbacks; exact lowered-node source
entries identify either their module resource template or the root-document variable that supplied
them. The resulting artifact contains the composed source, expanded `UiDocument`, resolved
dependency graph, namespaced typed resources, and source-map entries from flattened
composition/view/resource pointers to exact module source IDs and pointers. Its canonical SHA-256
covers all five structures together, so provenance-only drift also invalidates the artifact lock;
prepared IR has a separate integrity value. Machine, rule, schema, token, message, semantics, and
scenario resources remain inert JSON until their owning compiler explicitly admits them. See
[`@unislang/unifold-modules`](../packages/modules/README.md).

Repository applications declare reviewed relative source lists in module-project manifests. Their
production and E2E builds invoke the packaged `unifold module check` command, which re-resolves and
prepares the project, validates its committed lock, and fails on entry, module graph, complete
artifact, or IR drift without rewriting files. The primary reference and hierarchical example each
own one lock; Studio owns independent control-surface and live-application locks over a shared
presentation module.

## Hierarchical layout authoring boundary

The normalized graph is an execution format, not the authored shape. Authors may define a page as
an exact versioned `layoutType`, typed `variables`, and recursively nested nodes with `type`,
`props`, `children`, and `events`. Deterministic lowering converts this ergonomic hierarchy into the
same `$comp`/`$children` JsonUI tree used by direct authors and reusable compositions. IDs and parent
scopes survive lowering; the renderer never interprets both syntaxes.

Named component signals are data-only bindings. For example, `onClick: "DETAILS_OPEN"` lowers to
the enum-backed `activated` signal on that exact node. The canonical activation fact remains
unchanged in `runtime.events$`; only the XState input delivered to an owning ancestor actor receives
the alias. Component capability validation prevents a Text node from claiming an input event, and
JSON still cannot contain functions or inline actions. See [Layout-oriented JSON authoring](./layout-authoring.md).

Before lowering, the packaged layout schema and JSON-safety budget validate the complete authored
tree. Conditions resolve to booleans only; repeated nodes require a durable item key and reuse the
composition identity codec. Host-reviewed external definitions enter through an immutable bounded
registry capability supplied to preparation/mount options; JSON cannot name a registry or trigger a
fetch. Exact-version collisions reject, registry diagnostics use a virtual source pointer, authored
pointer provenance survives lowering, and invalid updates retain the last-known-good runtime and
DOM. A 500-node compilation workload is enforced as a repeatable p95 gate.

## Explicit control topology

An optional top-level `controls` object adds logical form ownership without changing the public
Scratch-style hierarchy. Its versioned, enum-backed nodes target stable visual IDs and declare one
of `form`, `group`, `array`, `record`, or `control`; nested nodes carry an aggregate `parentId` and a
durable sibling-unique `key`. The compiler rejects unknown fields/versions, missing or incompatible
targets, incomplete form/control coverage, duplicate IDs/keys, invalid roots, cycles, and inputs over
10,000 nodes before runtime creation.

IR and snapshots retain visual `parentId`/`scopePath` separately from logical `controlParentId`,
`controlChildIds`, and `controlKey`. Aggregate value/status propagation, rule dependencies, form
reset/submit, validation ownership, and event-scope disclosure therefore follow the logical graph
even when visual wrappers intervene. Logical ancestors are merged into event `scopePath` without
changing visual `parentId`. Legacy documents without `controls` use the validated visual parent
graph as a compatibility fallback; this is inference, not a persisted topology migration.

Normalized aggregate values and native submission are deliberately different projections. Logical
`parentId` plus `key` produces nested Group/Record objects and ordered Array values. Browser
`FormData` remains a flat ordered multimap produced from each component's native `name`; repeated
names stay repeated. Applications must author and test the mapping rather than compare the nested
object to `Object.fromEntries(new FormData(form))`.

The first slice has explicit limits. Topology is document-global, so composition-local IDs are not
yet namespaced or exported during composition expansion. Collection commands change normalized
logical membership from trusted snapshots but do not compile authored JSON or create/remove DOM;
they are a headless runtime seam, not the public dynamic-list completion. Aggregate disablement also
does not yet cascade canonical disabled/interactivity state to logical descendants. A native
`Fieldset` applies browser successful-control semantics, but that effect is not a replacement for
effective-disabled state in every snapshot.

`runtime.control<T>(id)` is the typed integration facade. Its live value, raw-value, status, and
error observables and transactional setters select or command the same normalized store; they do not
introduce a second form authority. `T` is a caller-supplied integration assertion today, not a type
generated from the authored schema. Angular and other host adapters can project that handle while
transaction identities prevent feedback loops.

## JsonUI authoring profile

Every document names `unifold-jsonui@1.0.0` and the exact upstream commit accepted by the executable
contract. The required `@unislang/unifold-jsonui` compiler package validates the syntax after
Unifold compositions expand and before IR is created. It accepts catalog `$comp` nodes, array
`$children`, JSON properties, required stable IDs, and a schema-checked Unifold `store`/`path`
extension. Undeclared upstream store shorthand, `$pathModifiers`, actions, modifiers, validation,
lists, named slots, localization, state export, primitive children, and unknown directives fail with
bounded, exact-pointer diagnostics.

The upstream React runtime is not a compiler or renderer dependency and therefore cannot become a
second state authority. A private parity workspace executes the pinned runtime as an independent
browser oracle without adding it to published framework dependencies. See the
[pinned JsonUI profile](./jsonui-profile.md) for the support matrix, evidence, and migration policy.

`prepareUnifoldDocument()` remains the stateless cold path. Hosts that repeatedly prepare identical
authored JSON can use `UnifoldDocumentCompiler`, whose bounded least-recently-used cache keys only
finite acyclic JSON and retains only successful preparation results. Every stored value and cache
hit is defensively cloned, so callers never share mutable authored data or IR through the cache.
Non-JSON input bypasses lookup entirely and therefore cannot collide with a valid cached document.

## Declared stores and bindings

`UiDocument.stores` declares typed, versioned domain-data boundaries without selecting an
in-framework persistence system. Each definition records source, access, ownership, persistence,
classification, initial-data policy, byte quota, an inclusive adapter-version range, and an embedded
Draft 2020-12 schema. Bound controls carry a store ID and RFC 6901 path into immutable IR. Compilation
rejects unknown stores, unresolved or type-incompatible paths, non-value components, invalid policy
combinations, remote schema references, and duplicate IDs.

At mount, the host supplies a trusted synchronous adapter for every declaration. Initial data is
cloned, schema- and quota-validated, and projected into normalized node snapshots. Read-only policy
also projects to control state. A writable bound value commits through the ordinary runtime first;
only a changed committed value produces a typed post-commit `store.write` effect. Adapter failure is
observable as an effect failure and does not roll back the UI transaction.

The source and persistence enums are policy metadata, not automatic connector selection. A parallel
async session contract provides authorized loading/commit/subscription, exact trusted migration
edges, complete-candidate optimistic commits, bounded idempotency identities, and explicit
reject/external-wins conflict policy. Independent memory and injected atomic key/value adapters run
one conformance suite. The opt-in async mount connects atomically before rendering, serializes each
store's effects, settles canonical effect facts from promises, and projects validated external
snapshots through one no-write-back runtime transaction. Richer merge arbitration, offline replay,
dynamic privileged reconnection, and distributed atomicity remain open. Runtime facts apply
classification-aware disclosure without changing those storage policies. See
[stores and control bindings](./stores-and-bindings.md) for the adapter contract and
[runtime event disclosure](./event-disclosure.md) for the stream boundary.

## Remote data actor boundary

Remote query and mutation state is separate from normalized UI/node state. A versioned data request
names only a trusted registered operation and bounded JSON variables, paging, sort/filter, cache,
timeout, expected-revision, and idempotency policy. The host adapter injects identity and
authorization outside the JSON boundary. A per-source coordinator cancels superseded work, rejects
late completions, applies safe bounded retry, rolls back optimistic leases, and exposes the same
promise contract to XState. A bounded TanStack Query Core cache owns remote results and
classification; mutation tags invalidate local and cross-context caches. See
[remote data sources](./data-sources.md).

## Document trust boundary

Text received from storage, a server, import, or collaboration enters through
`loadUnifoldDocument()`. A signed envelope is shape- and size-checked, then its Ed25519 signature is
verified over the exact payload bytes before parsing. A governed host policy resolves the key's
trusted issuer and active/revoked state, fingerprints exact payload bytes, and requires a validated
metadata-only durable audit receipt. Only afterward may trusted, bounded, explicit schema migrations
run; the migrated document still passes composition expansion and IR compilation.
Unsigned local authoring requires an explicit policy value and is never a fallback for failed
verification. Signatures establish integrity, not server authorization or executable capability.
See [document trust, signatures, and migrations](./document-trust.md).

## Server control-plane boundary

Authenticated mutations and external effects pass a separately packaged, replaceable control-plane
service. An opaque session resolves trusted actor and tenant context; capability and exact-resource
authorization deny by default. The server assigns revisions, acquires effect idempotency leases,
records redacted audit metadata, and emits tenant-local resumable sequences. Clients detect
retention gaps and resynchronize from authoritative document state.

The Phase 0 in-memory adapter selects shared-schema storage with mandatory tenant keys and verifies
backup integrity before restore. It is executable conformance evidence, not production identity,
storage, outbox, locking, or backup infrastructure. Production adapters must preserve atomic
revision/outbox/audit guarantees and can strengthen isolation without changing UI contracts. See
[control-plane trust, effects, sequencing, and recovery](./control-plane.md).

## Collaboration boundary

Collaborative edits use a separate versioned protocol. The server assigns immutable revisions and
accepts stale proposals only when their RFC 6902 paths are disjoint from every intervening change;
otherwise it returns structured path and sensitive-domain conflicts. Protected branches enforce
assigned distinct reviewers, author/reviewer separation, expiration, exact candidate approval, and
exact-head publication. Undo is compensating history, realtime facts are resumable with explicit
gaps, and presence is tenant-scoped ephemeral state. Trusted actor and resource-authorized
capabilities are injected through the control plane rather than accepted from request JSON. See
[server-sequenced collaboration](./collaboration.md).

## Custom-element realm compatibility

The native Custom Elements registry is realm-wide and irreversible. `defineUnifoldElements()`
therefore inspects every core tag before defining any missing tag. Constructors carry immutable,
tag-specific metadata for the exact enum-backed core catalog release. Exact duplicate copies are
accepted; foreign constructors, different releases, tag mismatches, constructor aliases, and
missing registries return typed data-only results. Application mount performs this check before
runtime or renderer creation and cannot opt out. Unexpected platform failures report partial
progress because a successful native definition cannot be undone.

Only one incompatible core catalog release may occupy a document realm. Independent iframes have
independent registries and are the supported isolation boundary. The shared metadata symbol
coordinates trusted packages and does not authenticate same-realm code. The clean-consumer packaging
gate creates two physical package directories from packed artifacts, proves their component
constructors are distinct while Lit is deduplicated, accepts the exact catalog release, and rejects
a different-release iframe without partially defining its registry.

## Canonical events and trusted DOM ingress

Stable components dispatch a bubbling, composed `unifold-event`. This value-bearing event is trusted
transient ingress inside the mounted application, allowing the coordinator to derive a typed command.
It is not the public subscription or telemetry surface.

`runtime.events$` is the public-safe canonical stream. Its immutable CloudEvents-shaped facts retain
identity, source, type, correlation, causation, transaction, sequence, state revision, phase, and
runtime context. Public ordinary facts may contain a complete change and snapshot. Non-public facts
retain source identity and allowlisted metadata but omit snapshots and value-bearing changes;
`store.write` facts are always metadata-only. Transactions use the most restrictive pre/post changed
node classification, forms use the most restrictive classification in their scope, and exception
messages are sanitized. See [runtime event disclosure](./event-disclosure.md).

Control input is an intent. Runtime commands commit atomically and then publish state facts. Effects
run only after commit. A failed transaction publishes a sanitized rejection fact without exposing a
partial state.

All commands declared by one XState transition re-enter runtime as one ordered batch. State and
effect commands therefore share one causal execution without manufacturing an effect-only state
revision. Empty, effect-only, and normalized no-op batches publish no `TransactionCommitted` fact
and neither advance nor retain a store revision. Production code outside `@unislang/unifold-runtime`
cannot import the normalized reactivity package, making the runtime boundary the executable owner
of UI state writes.

Source-node and ancestor-scope handles are indexed views over those same fact objects. A form scope
therefore observes descendant changes without a second Subject, and its aggregate snapshot is final
at the first post-commit callback.

Applications never share an implicit runtime singleton. A host that intentionally observes several
applications must use `createUnifoldApplicationObserver` with explicit application and tenant
identities plus an authorization callback. Authorization is reevaluated for every fact and fails
closed; the observer forwards only the runtime's existing classification-aware event projection.
Its output contains identity and event data only—never an application/runtime reference, command
port, or snapshot resolver—and observer disposal does not dispose an observed application. Duplicate
application identities, duplicate runtime references, unsafe identities, and more than 64 targets
reject before subscription.

Devtools are another explicit consumer of that same fabric. `@unislang/unifold-devtools` retains a
finite deduplicated window, records exact eviction evidence, and reads an immutable runtime
inspection snapshot rather than owning state. It applies a second metadata-only projection to
non-public nodes and facts. Fingerprinted document replay is data-only, sequential, host-validated,
and incapable of invoking recorded effects. See [runtime inspection and replay](./devtools.md).

## Selective rendering

Each node subscribes to a selector keyed by stable node ID. A transaction records changed node IDs
and paths. A dependency index evaluates global selectors plus selectors intersecting those IDs;
equality then suppresses unchanged results before notification. Deterministic dispatch metrics expose
active, candidate, changed-node, and invalidated counts. Structural commands
add and remove normalized nodes transactionally; removed indexed selections complete and removed
actor ownership is discarded. The DOM renderer performs keyed subtree insertion, removal,
replacement, reparenting, and ordering while preserving unrelated element identity and focus.

`@unislang/unifold` coordinates revised authored documents. It fully re-expands and compiles a
candidate, preflights renderer compatibility, and sends one atomic `structure.reconcile` command.
Compatible dirty controls retain user values and interaction state; pristine controls adopt revised
defaults. Keyed hosts, focus, subscriptions, manifests, and actor ownership follow node lifetimes.
Invalid candidates retain the last-known-good application, and a post-commit renderer failure is
compensated by reconciling the prior document. Incremental subtree compilation remains a measured
optimization, not a correctness dependency.

The stable `data-unifold-node-id` attribute identifies a rendered host. `data-unifold-render-count` is a diagnostic contract used to prove both expected updates and important non-updates; applications must not use it as business state.
The Chromium scale journey observes every host at 1,000 and 10,000 nodes and requires one target
mutation while preserving every unrelated host, the focused shadow input, and canonical event order.

## Form validation

Validation is a stateless operation over the authoritative node snapshot, never a parallel form
store. Controls declare stable validator IDs and an enum-backed `Input`, `Blur`, or `Submit` update
trigger. One runtime transaction commits the configured value boundary, validation status, stable
issues, touched state, descendant aggregates, and affected-node set. The renderer exposes tentative
`rawValue` without making it application truth and projects errors only after touch. Submit produces
the canonical `FormInvalid` or `FormSubmitted` fact after the transaction commits.

Asynchronous rules are registered separately and executed by XState promise actors. The control
snapshot stores the active request ID and `Pending` status; a newer applicable value aborts the
previous actor. Resolution and cancellation commands carry that identity, so a delayed or
non-cooperative result cannot commit after supersession. Started, completed, cancelled, and failed
facts use enum-backed canonical event types and retain causal/correlation metadata. Synchronous
errors prevent unnecessary async work.

Aggregate validators use the same registry and transaction. Each aggregate value is derived
deepest-first, validated against its complete child value, and then made available to its ancestor;
there is no transient valid revision between a child edit and the cross-field result. Standard
Schema issue paths can be mapped to stable affected component IDs. The aggregate owns the issue and
the normalized store derives a routing index from that ownership plus `affectedIds`. Route changes
invalidate target node IDs in the same transaction even when their snapshots are unchanged. The
renderer combines owned and routed issues only for presentation, preserving one error owner while
projecting both the form summary and affected controls.
For an ordinary leaf transaction, only the changed node and its aggregate ancestor chain are
recomputed and validated. Each affected aggregate still reads its immediate children, and removing
obsolete routed errors still scans the current route entries; submit, reset, and structural commands
may intentionally touch a broader set.

Reset and disable are explicit state commands rather than status or DOM shortcuts. Reset restores
each descendant's captured initial value, clears interaction flags, revalidates, recomputes ancestors,
and emits `FormReset` after commit. Disabled controls contribute neither committed form values nor
validation errors/status, but remain present in aggregate `rawValue`; enabling one immediately
revalidates it. This mirrors the useful separation between submitted and administrative form data
without introducing another store.

The OSS integration boundary is [Standard Schema](https://standardschema.dev/), whose store-free
validation interface lets Zod, Valibot, ArkType, and other compatible schemas plug into the graph.
The size-constrained reference supplies its cross-field rule through a minimal Standard
Schema-compatible validator; applications can substitute any conforming library without changing
the form graph or introducing another state authority.
[TanStack Form's `FormApi`](https://tanstack.com/form/latest/docs/reference/classes/FormApi) owns its
own base and derived stores, while [Lion forms](https://lion.js.org/fundamentals/systems/form/overview/)
center their own form-control mixins. Adopting either as the core would create a second authority, so
they remain candidates for adapters rather than runtime dependencies. This preserves OSS reuse
without duplicating or competing with the normalized Unifold store.

## Schema.org semantics

A JSON-authored `SemanticGraph` binds public assertions to the same committed node snapshots used
for rendering, either by node ID or by a typed composition control-value export. The compiler rejects missing, invisible, non-public, or non-control bindings and
unknown starter-vocabulary terms. It emits deterministic JSON-LD with the pinned Schema.org 30.0
context. Each application runtime owns and atomically replaces its light-DOM script after a
successful transaction. Independent owner IDs may coexist in one document, while duplicate scripts
for the same owner fail closed; semantic metadata is not inferred from clicks or accessibility
markup.

## Workflow machines

Versioned machine definitions are compiled from the document into XState v5 actors. An actor is
indexed to one owning node and receives canonical events only when that owner appears in the source
scope. JSON transitions contain targets, trusted command IDs, and an optional named guard. Host code
registers command factories that return typed `UiCommand` values and synchronous guard predicates
that receive the canonical event plus read-only access to current normalized snapshots. Commands
re-enter the normal transaction boundary as one transition batch with inherited correlation and
explicit causation, so
XState owns temporal state without becoming a second UI-value store.

Unknown owners, states, properties, command IDs, or guard IDs reject before mount or update. Guard
exceptions and non-true results fail closed without state transition. Unchanged
canonical definitions retain actor identity during structural reconciliation, while removed or
changed definitions are stopped. The initial flat-state profile is documented in
[JSON workflows with XState](./workflows.md); persistence, migrations, delays, invoked effects, and
nested/parallel states remain future schema additions.

## Framework boundary

The core does not require Angular. A dedicated Angular adapter can project the canonical control graph into `AbstractControl`, Observables, and signals while transaction IDs prevent feedback loops. This retains Angular Forms ergonomics without imposing Angular on plain HTML or other hosts.
