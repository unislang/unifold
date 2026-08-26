# Remote data sources

`@unislang/unifold-data` is the framework-neutral boundary for remote queries and mutations. JSON
documents may name an operation registered by trusted host code; they cannot supply a URL,
credentials, tenant, user, authorization context, adapter implementation, or executable callback.
The package is available directly and through the supported `@unislang/unifold` facade.

## Versioned contract

Every request uses protocol `1.0.0`, stable request and correlation IDs, a bounded registered
`operationId`, finite JSON variables, and an explicit query or mutation kind. The published Draft
2020-12 schema is available as
`@unislang/unifold-data/schemas/data-protocol.schema.json`. Runtime validation additionally enforces
the 256 KiB request, 32-level depth, 10,000-member, paging, sorting, timeout, cache, tag, and safe-ID
ceilings before a registered adapter runs.

Queries declare:

- cursor intent (`after` or `before`, never both) and a limit of at most 1,000;
- bounded sort and filter projections;
- fresh and retained cache windows; and
- either fail-closed or last-known-good offline behavior.

Mutations require an idempotency key and explicit invalidation tags. An optional expected revision is
passed to the trusted adapter, which reports conflicts through the safe result union. Optimistic UI
integration is a host port returning commit and rollback hooks; every non-success result,
cancellation, or supersession rolls the lease back.

Results are exactly one of `success`, `empty`, `validation-error`, `denied`, `conflict`, `not-found`,
`rate-limited`, `unavailable`, `timeout`, or `canceled`. Success and empty results retain their data
classification, source revision, received time, cursors, and invalidation tags. Failure results carry
only a stable code, safe message key, optional bounded parameters, and optional retry delay. Raw
provider exceptions and unvalidated result objects are converted to a safe adapter failure.

## Actor and cache behavior

`DataActorCoordinator.execute(actorId, request, signal)` gives each logical source one current
request. Starting another request for that actor aborts the previous adapter signal; a non-cooperative
late completion is returned as discarded and cannot enter the cache or commit an optimistic lease.
`createDataActor()` exposes the same operation as an XState promise actor and propagates actor stop
to the adapter signal.

The memory cache uses pinned TanStack Query Core 5.102.3 behind a bounded Unifold port. Query keys
include operation, variables, cursor page, sort, and filter but exclude request/correlation identity.
Entries observe declared retention, least-recently-used eviction, and exact classification. Tag
invalidation scans the index once and removes matching Query Core records in one predicate pass.
A replaceable invalidation bus broadcasts successful mutation tags across tabs or workers; one
broken listener cannot suppress delivery to other contexts.

Only `unavailable`, `timeout`, and `rate-limited` results retry. Attempts are limited to five with
bounded exponential backoff and jitter; server `retryAfterMs` remains capped at five minutes.
Validation, denial, conflict, not-found, and cancellation never retry. Mutation retry is safe because
the request contract requires an idempotency key. Timeout actively aborts the adapter attempt.

The built-in cache and invalidation bus are in-memory conformance implementations. Durable offline
data, tenant isolation, encrypted persistence, service-worker or broadcast transports, server
authorization, conflict UX, and telemetry remain trusted adapter responsibilities.

## Verification

Focused contract tests cover the JSON Schema and runtime ceilings, stable key normalization, LRU and
retention expiry, offline recovery, safe retry selection, optimistic commit/rollback, revision
conflict, cross-context invalidation, cancellation, timeout abort, stale-result rejection, malformed
adapter containment, and XState/facade integration.

The performance fixture warms exactly 1,000 query keys and resolves the full set twenty times with
exactly zero additional adapter calls. On the current developer workstation, cached batches measure
5.35/6.90/9.97 ms p50/p95/p99 against a 250 ms p95 gate. Exact invalidation of all 1,000 tagged
entries measures 0.29/1.00/2.48 ms against a 100 ms p95 gate. Run both gates with
`pnpm benchmark:selective`; workstation timings remain descriptive until ratified on the pinned
runner.
