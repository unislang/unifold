# Architecture

Unifold is a framework-neutral UI runtime. JSON is the portable source, the normalized node graph is the single state authority, and public event facts join components, forms, pages, applications, actors, tooling, and tests.

```text
JSON document
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
instance ID; consumers integrate through `runtime.composition(instanceId)` export aliases.

The authored document remains the editable and exportable source; expanded JSON is a derived compiler input. See [Reusable JSON compositions](./compositions.md) for the current contract and its P0 hardening gates.

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

The source and persistence enums are policy metadata, not built-in route, browser-storage, query, or
remote implementations. The current seam has no asynchronous adapters, external subscriptions,
executed migrations, conflict handling, or distributed atomicity. Runtime facts apply
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
verified over the exact payload bytes before parsing. Only afterward may trusted, bounded, explicit
schema migrations run; the migrated document still passes composition expansion and IR compilation.
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

Source-node and ancestor-scope handles are indexed views over those same fact objects. A form scope
therefore observes descendant changes without a second Subject, and its aggregate snapshot is final
at the first post-commit callback.

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
[Valibot object validation](https://valibot.dev/guides/objects/) supplies the reference cross-field
rule through its Standard Schema implementation, `check`, and path-forwarding support.
[TanStack Form's `FormApi`](https://tanstack.com/form/latest/docs/reference/classes/FormApi) owns its
own base and derived stores, while [Lion forms](https://lion.js.org/fundamentals/systems/form/overview/)
center their own form-control mixins. Adopting either as the core would create a second authority, so
they remain candidates for adapters rather than runtime dependencies. This preserves OSS reuse
without duplicating or competing with the normalized Unifold store.

## Schema.org semantics

A JSON-authored `SemanticGraph` binds public assertions to the same committed node snapshots used
for rendering, either by node ID or by a typed composition control-value export. The compiler rejects missing, invisible, non-public, or non-control bindings and
unknown starter-vocabulary terms. It emits deterministic JSON-LD with the pinned Schema.org 30.0
context. One document-head publisher owns and atomically replaces the light-DOM script after a
successful transaction; semantic metadata is not inferred from clicks or accessibility markup.

## Workflow machines

Versioned machine definitions are compiled from the document into XState v5 actors. An actor is
indexed to one owning node and receives canonical events only when that owner appears in the source
scope. JSON transitions contain targets and trusted command IDs; host code registers factories that
return typed `UiCommand` values. The command re-enters the normal transaction boundary with inherited
correlation and explicit causation, so XState owns temporal state without becoming a second UI-value
store.

Unknown owners, states, properties, or command IDs reject before mount or update. Unchanged
canonical definitions retain actor identity during structural reconciliation, while removed or
changed definitions are stopped. The initial flat-state profile is documented in
[JSON workflows with XState](./workflows.md); persistence, migrations, named guards, invoked effects,
and nested/parallel states remain future schema additions.

## Framework boundary

The core does not require Angular. A dedicated Angular adapter can project the canonical control graph into `AbstractControl`, Observables, and signals while transaction IDs prevent feedback loops. This retains Angular Forms ergonomics without imposing Angular on plain HTML or other hosts.
