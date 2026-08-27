# @unislang/unifold-runtime

The framework-neutral Unifold composition root. Each `UnifoldRuntime` owns one
event fabric, normalized store, actor routing index, monotonic event sequence,
and disposal boundary. There is no browser-window singleton.

```ts
import { UiCommandType } from "@unislang/unifold-events";
import { UnifoldRuntime } from "@unislang/unifold-runtime";

const runtime = new UnifoldRuntime({
  documentId: "customer-editor",
  initialNodes
});

runtime.events$.subscribe((event) => console.info(event));
runtime.scope("customer-form").events$.subscribe((event) => console.info(event));
runtime.execute([
  {
    type: UiCommandType.ControlSetValue,
    id: "customer-email",
    value: "person@example.com"
  }
]);
```

All state commands in one `execute` call commit at one revision. Canonical facts
are published only after snapshots and selections expose the complete commit.
Non-state commands are sent to an optional `UiCommandPort` only after the state transaction commits.

Multi-package application updates use `beginCoordination()` as one exclusive publication boundary.
Only the returned handle may execute commands while the boundary is open; ordinary runtime handles,
selection creation, actor registration, intent ingestion, and direct execution fail closed. Candidate
snapshots and revisions remain readable by the coordinator, while canonical facts, XState routing,
store writes, command-port effects, owner cleanup, and async-validation starts wait for resolution.
`discard()` restores the prior graph revision, event sequence, derived-rule program, store bindings,
and composition manifests without publishing or invoking effects. Commit first validates the
publication outbox and checkpoints the exact actor-owner index. Old routes are removed and staged
actors installed while the normalized store remains discardable; any pre-commit failure restores
the actor index and candidate store. After the store commit, fact and adapter failures are contained
because they can no longer reverse accepted state. Facts drain in sequence order before effects and
validation, and actor-triggered reentrant execution appends behind every already-buffered
lower-sequence fact. Actor adapters are isolated observers: one adapter exception cannot interrupt
sibling routing or invalidate an already committed fact.

The command fact, `EffectRequested`, and its `EffectCompleted` or `EffectFailed` terminal share one
opaque CloudEvents `subject`. The same value is the required `effectId` in the port's
`UiEffectExecutionContext`, so concurrent identical effects remain joinable even when asynchronous
settlement order differs. A port failure cannot relabel or roll back an already committed
transaction, and it does not terminate `events$`.

Every dispatched effect receives an opaque ID before invocation. The originating command fact uses
that ID as both its event ID and lifecycle subject; requested and settlement facts retain the same
subject even when indistinguishable async commands settle out of order. `UiCommandPort.execute()`
receives the ID in `UiEffectExecutionContext`, so adapters and deterministic replay can correlate
their receipt without copying provider input, output, or error text into public event data. Machine
effects attribute their public snapshot/source metadata to the owning authored node while preserving
the triggering fact's causation and correlation chain.

Optional `storeBindings` map control IDs to declared store IDs and JSON Pointer paths. After a bound
control value commits—including blur/submit-deferred commits and form reset—the runtime derives a
typed `store.write` command and sends it through the same effect port. The normalized node store
remains authoritative; adapters are effects, not a parallel observable state tree.

`node(id)` is the indexed source-node view. `scope(id)` is the indexed descendant view used by
forms, compositions, pages, and applications. Both deliver the same immutable event objects as the
root stream; they do not re-emit or copy facts. This shared stream is public-safe: public ordinary
events may include full data, while non-public events retain source identity and safe metadata but
omit snapshots and value-bearing changes. A direct runtime snapshot read during a scope callback
still exposes the complete committed aggregate revision and is a deliberate privileged operation.

`control<T>(id)` is the live control view over that same store. Its synchronous `value`, `rawValue`,
`status`, `errors`, and `snapshot` getters remain current; matching observables begin with the current
fact and continue with indexed changes. `setValue`, `markTouched`, `setDisabled`, and `reset` execute
canonical commands, and `dispose()` releases the handle-owned selections. The generic is supplied by
the caller today; schema-generated control typing remains future tooling work.

Transaction disclosure uses the most restrictive classification among changed nodes before and
after commit. Form results use the most restrictive classification in the form scope. Derived
`store.write` facts are always metadata-only, and runtime failure facts never publish raw exception
text. The complete policy is documented in
[runtime event disclosure](../../docs/event-disclosure.md).

`FormSubmit` commits submit-deferred descendants, validates enabled controls, marks them touched,
and publishes `FormInvalid` or `FormSubmitted`. `FormReset` restores every descendant from its
captured `initialValue` and publishes `FormReset` after the same atomic commit. `ControlSetDisabled`
is distinct from validation status: disabled controls are omitted from committed aggregate values
and validation but retained in aggregate `rawValue` for explicit administrative access.

Declared `asyncValidators` run through injected registry handlers as XState promise actors. Each
run first commits `Pending` plus a request ID. Supersession aborts the actor, and resolve/cancel
commands are guarded by that request ID before touching the normalized graph. The stream publishes
`ValidationStarted`, `ValidationCompleted`, `ValidationCancelled`, or `ValidationFailed` with the
request identity and causal metadata; synchronous errors skip async invocation.

Validation errors retain one `ownerId`. The normalized store derives target routes from
`affectedIds`, includes route changes in transaction invalidation, and exposes routed errors
separately for selectors and rendering. This lets an aggregate rule update an otherwise unchanged
field without introducing a second error store or falsifying snapshot ownership.

`composition(instanceId)` is the stable integration view for an expanded composition manifest. It
exposes the instance definition identity, scope events and snapshot, typed exported selections,
filtered exported events, and command targets. These accessors resolve aliases to current generated
node IDs without exposing those IDs as the consumer contract.

Structural instantiate/remove commands share the normal atomic transaction and event path. A
successful removal completes indexed selections owned by the removed node and removes its actor
registrations before later facts are routed. The DOM renderer uses the same durable IDs for keyed
subtree reconciliation.

Logical collection insert/move/remove commands currently mutate normalized membership from trusted
snapshots. They do not compile authored JSON or create/remove rendered hosts, so consumers must not
treat them as the finished dynamic-collection API. The packaged completion will name a compiled
template/composition and reconcile authored structure, runtime, and DOM together.

These collection commands plus `StructureInstantiate`, `StructureReconcile`, and `StructureRemove`
are intentionally available on the explicit headless `UnifoldRuntime`. A mounted application from
`@unislang/unifold` exposes an allowlisted runtime capability instead, so raw structural commands
cannot bypass its authored-document coordinator.

`StructureReconcile` is the whole-graph structural command used by the application coordinator. It
validates the candidate topology before mutation, adds and removes nodes atomically, rebuilds parent
ordering, and updates the composition manifest at the same revision. A retained node with the same
kind and component type keeps dirty user state; a pristine control adopts revised authored defaults,
while an incompatible node starts a new lifecycle.

Leaf commands use the reactivity package's dependency index and affected-ancestor aggregation;
`getSelectionDispatchMetrics()` exposes exact candidate and invalidation counts for tests and
instrumentation. Broad submit, reset, and structural commands report the wider changed-node set.
