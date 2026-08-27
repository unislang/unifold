# @unislang/unifold-reactivity

Per-runtime reactive infrastructure for Unifold. RxJS supplies the hot multicast
observable implementation, while Immer supplies structural sharing and atomic
draft commits.

The package adds Unifold-specific behavior:

- indexed views by source node, ancestor scope, and event type;
- one immutable normalized node graph per runtime;
- synchronous snapshots and bounded transaction records;
- transactional form, group, record, and array aggregates whose value, raw value, initial value,
  status, errors, dirty/pristine, touched, and pending state are recomputed before publication;
- a node-to-selection dependency index that evaluates only global selections and selections whose
  declared node dependencies changed;
- incremental aggregate and validation-route recomputation over changed nodes and their ancestor or
  error-owner closure;
- deterministic dispatch diagnostics for active, candidate, changed-node, and invalidated counts;
- completion and deregistration of indexed selections when a structural transaction removes one of
  their declared node dependencies.

Aggregate object keys prefer explicit `controlKey`, then a child's declared `name`, and finally its
stable node ID. Explicit `controlChildren` ordering is independent from visual child ordering.
Disabled descendants are omitted from `value` and retained in `rawValue`. Nested aggregates are
computed by logical depth inside the same Immer transaction, so visual depth cannot leave an
ancestor with a partially updated child tree.

The 1,000- and 10,000-node correctness and timing harness is documented in
[`docs/performance.md`](../../docs/performance.md). It keeps exact dependency wake-up assertions
separate from environment-sensitive release budgets.

`createEventFabric()` returns a controller because publishing is a capability.
The composed runtime retains that controller and exposes only its read-only
`fabric` member to application code.
