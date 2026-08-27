---
"@unislang/unifold-contracts": minor
"@unislang/unifold-compositions": minor
"@unislang/unifold-elements": minor
"@unislang/unifold-events": minor
"@unislang/unifold-ir": minor
"@unislang/unifold-reactivity": minor
"@unislang/unifold-renderer-dom": minor
"@unislang/unifold-runtime": minor
"@unislang/unifold-semantics": minor
"@unislang/unifold": minor
---

Add an enum-backed, JSON-authored logical control topology independent from visual nesting,
composition `2.0.0` local topology and caller mounts, live typed control handles, logical aggregation
and form/event traversal, migration-safe async state, separate own/effective disabled propagation,
and authorized authored repeat insert/move/remove operations with durable keys and explicit order.
Reject structural reentry, unknown operations, inherited registry names, unsafe numeric keys, and
duplicate authority for one authored array; keep raw pointer bindings package-internal.
Couple named repeats to explicit logical Array/Record controls, preserve aggregate value/order, and
restrict mounted runtime and renderer capabilities so only authored application APIs can change
structure. Accept trusted collection correlation/causation outside authored JSON while retaining
runtime-owned transaction identity and all structural primitives on the explicit headless runtime.
Extend Playwright evidence across mounted repeat insertion, key-based movement, removal,
last-known-good rejection, retained value/host/focus, causal structural events, and discarded stale
validation from a removed control. Extend the locked hierarchical example across nested values,
native `FormData`, aggregate disable/restore, XState, Schema.org, selective projection,
submit/reset, and accessibility.

Transfer focus deterministically when a focused authored member is removed: prefer the next member,
then the previous member, resolve nested enabled controls through composed layout hosts, and publish
one canonical focus effect with trusted operation lineage after successful UI commit. Do not create
an artificial focus stop when the collection becomes empty.
