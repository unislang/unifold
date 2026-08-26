# Control-plane trust, effects, sequencing, and recovery

The control plane is an optional server boundary. Standalone JSON UI rendering remains usable
without it, while authenticated document mutation and external effects must pass it.

## Trust boundary

Clients submit an opaque session token, protocol version, enum-backed operation, request ID, and
correlation ID. The identity port resolves the trusted actor and tenant. Client JSON has no `actorId`
or `tenantId` field, and the Draft 2020-12 request schema rejects either field as unevaluated input.

Authorization requires both a capability in the trusted session and an exact actor/tenant/resource
grant. Missing sessions, capabilities, or object grants deny by default. Denials use stable safe
error codes and record only allowlisted audit metadata after a tenant is known.

The Phase 0 reference chooses shared-schema storage with a mandatory tenant key. Every document,
idempotency, realtime, audit, and backup lookup includes the trusted tenant. A production customer
can move to a schema-per-tenant, database-per-tenant, or deployment-per-tenant adapter behind the
same store port without changing the browser or document contracts.

## Revision and effect guarantees

Document revisions are server assigned. Creation accepts no expected revision; an update must name
the current server revision. A successful adapter operation stores the immutable revision, appends
redacted audit metadata, and adds a tenant-sequenced outbox notification atomically. The in-memory
adapter provides the same visible contract; production adapters must use their database transaction
and outbox facilities.

Effects resolve only by a registered capability name. The idempotency fingerprint covers the effect
ID, object ID, and canonical input. A key is acquired before invocation, then completed with either
the safe output result or a stable failure result. Matching retries replay that result; a different
request using the same key conflicts. Neither input, output, session token, nor raw provider error
appears in audit details.

## Realtime recovery

Every committed revision, completed effect, and restore advances a tenant-local server sequence.
Resume returns only messages after the supplied cursor. If retention has removed an earlier
message, the result is `ControlPlaneOperationStatus.Gap` with
`ControlPlaneErrorCode.RealtimeGap`; the client must reread authoritative objects and resume from a
fresh cursor. WebSocket delivery is therefore never mistaken for a durable log.

The framework-neutral `createControlPlaneRealtimeCursor()` calls the same authoritative resume
operation directly or through HTTP. A successful response must be safe JSON, fit the configured
message limit, contain one tenant, and advance contiguously from the current cursor through the
declared latest sequence. Malformed, backward, discontinuous, or oversized batches throw a stable
protocol error without moving the cursor. A gap result also preserves the cursor; the host must
reread authoritative documents before resetting it explicitly.

## Bounded HTTP transport

`createControlPlaneHttpHandler()` adapts the service to standard Fetch requests and responses, so
Node, edge, service-worker, and framework hosts can supply routing without changing the protocol.
The default endpoint is `POST /v1/control-plane` with `application/json`. Request bodies are decoded
incrementally as strict UTF-8 under a one-megabyte default. Exact operation fields, identifier
limits, 32-level nesting, 20,000 total JSON members, finite numbers, and prototype-sensitive key
rejection are enforced before orchestration. Responses are non-cacheable JSON with deterministic
HTTP mapping; unexpected host/service exceptions become only `transport-unavailable`.

`createControlPlaneHttpClient()` implements the same typed service interface over a supplied or
global Fetch implementation. It validates requests before network I/O, bounds responses to four
megabytes by default, requires JSON and protocol/HTTP status agreement, and classifies abort,
unavailable, oversized, and malformed responses using stable local transport errors. CORS, CSRF,
cookies, step-up, TLS termination, rate limiting, and session-token placement/rotation remain host
deployment responsibilities; the generic adapter does not claim those controls.

## Backup verification

A reference backup captures tenant-scoped document and idempotency state. Its receipt includes a
SHA-256 digest over RFC 8785 canonical tenant/document content. Restore recomputes the digest before
changing state, keeps audit and current sequencing append-oriented, and emits a restore
notification. Production adapters additionally own encryption, retention, failure-domain copies,
scheduled restore drills, key rotation, and recovery objectives.

## Replaceable ports and OSS boundary

Unifold owns the protocol, safe errors, orchestration order, redaction rules, and conformance suite.
It does not implement a production identity provider, fine-grained authorization database,
transaction manager, message broker, secrets system, telemetry SDK, or backup platform.

- The authorization port can adapt OpenFGA or a host policy engine.
- Audit and trace correlation can adapt OpenTelemetry and the host's append-oriented audit store.
- The store port can adapt a transactional database plus outbox.
- The effect registry can adapt queues and registered provider clients.

The in-memory adapter and generic wire transports exist only to exercise positive, denial,
cross-tenant, stale-revision,
idempotency-conflict, failure-replay, quota, sequence-gap, backup-integrity, and restore behavior
without making those infrastructure choices mandatory dependencies.
