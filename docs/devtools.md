# Runtime inspection and deterministic replay

`@unislang/unifold-devtools` is the framework-neutral inspection boundary for the normalized
runtime. It exposes a bounded canonical-event timeline, privacy-aware node picker, deterministic
document diff, and validated data-only replay. It is suitable for Studio panes and host debugging,
but it is neither a second state authority nor a durable audit store.

## Runtime session

Create `UnifoldDevtoolsSession` with the authoritative `UnifoldRuntime`. The session subscribes to
the existing hot `runtime.events$` stream and pairs each new fact with its retained transaction
record. `nodes()` reads one immutable `runtime.inspect()` snapshot; `events()` filters the bounded
timeline by event type, phase, node, scope, transaction, correlation, or causation chain.

The default timeline capacity is 1,000 entries. Hosts may select an integer from 10 through 10,000.
Older entries are evicted, `dropped` records the exact count, event IDs are deduplicated only within
the retained window, and `dispose()` unsubscribes and clears retained entries. No `ReplaySubject` or
independent node store is introduced.

## Privacy projection

Public nodes may be returned with their complete already-immutable runtime snapshot. Confidential,
restricted, and secret nodes return source metadata only. Timeline facts are defensively cloned and
deeply frozen; any fact whose canonical disclosure mode is `metadata-only` has `change` and
`snapshot` removed again at the devtools boundary. This defense-in-depth projection does not grant
telemetry, persistence, or disclosure capabilities to a host.

The node picker accepts an optional scope, normalized text query, and result limit. Queries are
bounded to 128 characters and results to 500 nodes.

## Document diff and replay

`createDocumentDiff(before, after)` produces frozen RFC 6902 operations plus SHA-256 fingerprints
of RFC 8785-style canonical JSON. A replay plan uses protocol `1.0.0`, an initial document, and no
more than 10,000 sequential frames or 256 operations per frame. The exported
`schemas/replay-plan.schema.json` rejects extra properties and invalid operation shapes.

`replayDocument()` also performs an independent runtime check before applying data. It rejects
non-finite or prototype-sensitive JSON, unsafe JSON Pointer tokens, nesting beyond 32 levels, more
than 20,000 JSON members, non-SHA-256 fingerprints, malformed sequences, base divergence, patch
failure, host validation diagnostics, and unexpected result fingerprints. Replay applies JSON
Patch to a clone and returns a deeply frozen result. It cannot execute commands, actors, network
requests, timers, or recorded effects.

The host validation port must run the current document compiler or an equally strict validation
boundary. Successful patch mechanics alone never establish that a replayed document is supported.

## Verification

```sh
pnpm --filter @unislang/unifold-devtools test
pnpm exec tsc -p packages/devtools/test/tsconfig.json --pretty false
pnpm exec vitest run tests/performance/devtools.test.ts --config tests/performance/vitest.config.ts
pnpm benchmark:selective
```

The deterministic scale fixture captures 10,000 events into a 1,000-entry timeline and requires
exact drop and retained-sequence evidence. It also projects 500 alternating public/restricted nodes
and requires every restricted projection to omit its snapshot. Twenty timing samples enforce p95
limits of 1,000 ms for timeline capture/filtering and 100 ms for node picking; the 2026-08-25 local
run measured 44.26 ms and 0.30 ms respectively.

Studio canvas highlighting, visual pane layout, durable recording, remote transport, and effect
simulation remain host responsibilities. Durable security/audit evidence belongs to the control
plane, not this process-local inspection package.
