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

`createOpenFgaAuthorizationPort()` is the executable external-policy mapping. It accepts the
official JavaScript client's `check()` surface, pins the configured authorization-model ID on every
request, converts capabilities to closed underscore relations, and encodes tenant/actor/resource
segments into `unifold_principal` and `unifold_resource` tuples. Session capability checks happen
before network I/O. Invalid tuple identities, false or missing decisions, and provider exceptions
all deny without leaking the provider cause. Hosts create relationship tuples with the exported
`openFgaTupleForAuthorizationRequest()` mapping and own store/model lifecycle, credentials,
consistency, retry, and availability policy.

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

The worker-facing `ControlPlaneDurableStorePort` makes that outbox requirement executable. Lease,
acknowledgement, and release commands have bounded unique sequence sets, canonical UTC timestamps,
and tenant/worker identities. At most 100 ordered rows can be reserved at once. Only the current
owner can acknowledge before expiry; release schedules a retry, expiry permits takeover, and every
new reservation increments the attempt count. Delivery rows are independent from retained realtime
rows so broker completion does not erase reconnect evidence.

`SqliteControlPlaneStore` supplies the second implementation over caller-owned Node SQLite. Its
tenant, document, effect, audit, realtime, outbox, and backup tables are `STRICT`; document and
effect completion use `BEGIN IMMEDIATE` so state, safe audit metadata, realtime history, and outbox
publication commit or roll back together. Injected database triggers prove rollback at the storage
layer. A shared suite applies the same revision, tenant-isolation, recovery, concurrent lease,
idempotency, expiry, stale-owner, and replay assertions to SQLite and the in-memory adapter. The
Node 22.14 `node:sqlite` API reports itself experimental, so deployment owners must explicitly
accept that runtime boundary or implement the same port with their supported database driver.

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
unavailable, oversized, and malformed responses using stable local transport errors.

For cookie deployments, `createReferenceControlPlaneHttpAdmission()` plugs into the same handler
after the body has been read and decoded once under its existing limit. It requires exact configured
Origin membership, a single `__Host-unifold-session` cookie matching the body session token, an
unexpired non-revoked server record, and a matching `X-Unifold-CSRF` header. Admission exceptions
fail closed as a generic denial. Tests cover missing/mismatched tokens, duplicate cookies,
cross-origin requests, expiration, revocation, CSRF failure, and rejected PUT. Hosts still own CORS
response policy, TLS, cookie attributes and issuance/rotation, step-up, rate limiting, and durable
session/revocation storage.

## Backup verification

A reference backup captures tenant-scoped document and idempotency state. Its receipt includes a
SHA-256 digest over RFC 8785 canonical tenant/document content. Restore recomputes the digest before
changing state, keeps audit and current sequencing append-oriented, and emits a restore
notification. Production adapters additionally own encryption, retention, failure-domain copies,
scheduled restore drills, key rotation, and recovery objectives.

`EncryptedControlPlaneRecovery` makes the external portion executable without choosing a vault or
key manager. It canonicalizes and bounds the exported tenant snapshot, encrypts it with AES-256-GCM,
authenticates tenant/backup/time/algorithm/version/key metadata, records a SHA-256 plaintext digest,
and writes only the envelope to the injected vault. A scheduled host calls `runRestoreDrill()`;
the coordinator resolves the envelope's exact key ID, decrypts, verifies integrity and JSON bounds,
and invokes an isolated restore port. Last-known-good advances only after isolated verification and
checkpoint persistence. Every provider failure is reduced to a stable local code, and cancellation
is checked between stages.

`SqliteControlPlaneRecoverySource` supplies the concrete SQLite integration: it exports documents
and idempotency state, validates tenant/object/effect identity, restores into a disposable scratch
database transaction, and compares the canonical round-trip before returning success. The
five-sample 1,000-document encrypted backup plus scratch-restore gate measures 40.70 ms p95 against
2,000 ms. Production still owns external failure-domain storage, retention/deletion policy,
hardware-backed key custody and rotation, scheduler availability, alerts, and RPO/RTO selection.

## Telemetry

`instrumentControlPlaneWithOpenTelemetry()` wraps the complete typed service and accepts the stable
tracer/meter API shape. Spans carry only operation, protocol, request ID, correlation ID,
traceparent presence, and final status. Counter and duration metrics carry only operation, protocol,
and status, avoiding tenant/object/session cardinality and disclosure. Unexpected exceptions are
recorded with a fixed safe description before the original error is rethrown to the already-redacting
HTTP boundary. The host initializes the OpenTelemetry SDK, extracts W3C context before invocation,
and owns sampling, processors, exporters, and retention.

## Replaceable ports and OSS boundary

Unifold owns the protocol, safe errors, orchestration order, redaction rules, and conformance suite.
It does not implement a production identity provider, fine-grained authorization database,
transaction manager, message broker, secrets system, telemetry SDK, or backup platform.

- The authorization port includes an official-client-compatible OpenFGA mapping or can adapt a host
  policy engine.
- The service includes an OpenTelemetry-compatible instrumentation wrapper; hosts still supply the
  SDK/export pipeline and append-oriented audit store.
- The store port can adapt a transactional database plus outbox.
- The effect registry can adapt queues and registered provider clients.

The in-memory adapter and generic wire transports exist only to exercise positive, denial,
cross-tenant, stale-revision, idempotency-conflict, failure-replay, quota, sequence-gap,
backup-integrity, encrypted scratch restore, session/CSRF admission, and telemetry-redaction
behavior without making deployment infrastructure mandatory dependencies.
