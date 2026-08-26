# `@unislang/unifold-control-plane`

Versioned server-boundary contracts, orchestration, and a deterministic in-memory conformance
adapter for Unifold. The browser runtime does not depend on this package.

The implemented Phase 0 seam is:

```text
opaque session token
  -> trusted actor/tenant resolution
  -> deny-by-default capability + object authorization
  -> server-assigned immutable document revision
  -> tenant sequence notification + redacted audit metadata
  -> registered effect lease/invocation/idempotent result
  -> integrity-recorded backup and verified restore
```

Every request declares `ControlPlaneProtocolVersion.Version1`, an enum-backed operation, request and
correlation IDs, and an opaque session token. Tenant and actor identity are derived only from the
identity port. The public JSON Schema is exported at
`@unislang/unifold-control-plane/schemas/control-plane.schema.json` and rejects client-supplied
tenant identity.

`createControlPlaneService()` accepts replaceable identity, authorization, effect-registry,
fingerprint, clock, and store ports. A production store adapter must make each high-level mutation
atomic with its durable audit record and transactional outbox notification. Effect execution uses
an acquired idempotency lease and persists both successful and safe failed results, so a retry does
not repeat a possibly completed side effect.

`ControlPlaneDurableStorePort` adds the worker-facing outbox contract. A worker leases at most 100
ordered messages using canonical UTC instants, acknowledges only rows covered by its unexpired
lease, or releases rows with an explicit next-available instant. A second worker cannot reserve a
live lease; after expiry it can take over with an incremented attempt count, and the stale owner can
no longer acknowledge the row. Realtime retention and delivery retention are separate: a broker
acknowledgement cannot erase the bounded reconnect history.

`createReferenceControlPlane()` supplies a shared-schema/tenant-key in-memory adapter for local
development and the conformance suite. It denies absent grants, scopes every key by the trusted
tenant, imposes document and realtime-retention limits, detects sequence gaps, canonicalizes effect
requests with RFC 8785 before SHA-256 hashing, excludes effect values from audit details, and checks
backup integrity before restore.

`SqliteControlPlaneStore` is the independent database-backed adapter and accepts a caller-owned
Node `DatabaseSync`. It creates tenant-keyed `STRICT` tables and uses `BEGIN IMMEDIATE` transactions
for revisions, idempotency results, redacted audits, retained realtime rows, and pending outbox
rows. Database-trigger failure tests prove document and effect publication roll back every related
row. The exact same durability conformance suite runs against the SQLite and reference-memory
adapters. Node 22.14 still labels `node:sqlite` experimental, so this is deployable conformance and
replaceability evidence, not a silent commitment to that driver for every production database.

`createControlPlaneHttpHandler()` exposes the service through the standard Fetch `Request` and
`Response` contract without choosing a server framework. It accepts only `POST application/json`
at the configured path, reads UTF-8 incrementally under a byte limit, rejects unknown fields and
prototype-sensitive or excessive JSON, maps protocol statuses deterministically, sets `no-store`
and `nosniff`, forwards cancellation to effects, and converts unexpected failures to one safe error.
`createControlPlaneHttpClient()` applies the corresponding request and response limits, validates
the result envelope and HTTP status agreement, and classifies cancellation, unavailability,
oversize, and invalid responses without exposing transport causes.

Hosts that use cookie sessions can pass `createReferenceControlPlaneHttpAdmission()` as the HTTP
handler's `admission` option. Admission requires an exact configured Origin, one bounded
`__Host-unifold-session` cookie whose value matches the decoded body token, an active non-revoked
session record, and a constant-work comparison with `X-Unifold-CSRF`. Missing, expired, revoked,
cross-origin, duplicate-cookie, mismatched-token, and non-POST requests fail before service
dispatch. TLS, cookie issuance/rotation, user authentication, and distributed revocation storage
remain host responsibilities.

`createControlPlaneRealtimeCursor()` uses any `resumeRealtime` service, including the Fetch client.
It advances only after a safe, contiguous, single-tenant sequence; explicit gaps leave the cursor
unchanged until the host rereads authoritative state and calls `resetAfterAuthoritativeRead()`.

`authorizeCollaborationActor()` bridges an already trusted session to the collaboration protocol.
It asks the configured object-authorization port about each collaboration capability present in
the session for an exact resource and returns only allowed capabilities in an immutable actor
context. It does not bypass grants or accept identity from collaboration JSON.

`createOpenFgaAuthorizationPort()` accepts the official SDK's narrow structural `check()` shape,
pins an authorization-model ID on every call, maps every capability to a closed relation, and
percent-encodes actor, tenant, and exact resource IDs into tenant-scoped tuples. It checks the
trusted session capability locally and converts false, absent, malformed, and thrown provider
results to `deny` without exposing provider errors.

`instrumentControlPlaneWithOpenTelemetry()` wraps any control-plane service with the stable
OpenTelemetry tracer/meter API shape. Spans retain only operation, protocol, request/correlation,
trace-context-presence, and status attributes; metrics retain only low-cardinality operation,
protocol, and status dimensions. Object IDs, session tokens, tenant/actor IDs, inputs, outputs, and
raw exceptions are never exported. The deployment owns SDK initialization, propagation, sampling,
processors, and exporters.

`EncryptedControlPlaneRecovery` creates external AES-256-GCM envelopes through injected snapshot,
key, vault, and checkpoint ports. Tenant, backup, creation time, algorithm, version, and key ID are
authenticated metadata; plaintext receives a SHA-256 integrity check and a configurable byte cap.
`runRestoreDrill()` resolves the recorded key, decrypts and validates the snapshot, invokes an
isolated restore verifier, and advances last-known-good only after success. Cancellation, missing
keys/backups, tampering, vault failures, and failed scratch restores return stable redacted codes.
`SqliteControlPlaneRecoverySource` implements export and isolated verification by round-tripping a
tenant through a disposable SQLite database.

The memory reference adapter is not a production identity system, database, distributed lock,
key-management service, external vault, message broker, or push connection server. The OpenFGA,
OpenTelemetry, admission, and encrypted-recovery adapters deliberately accept deployment-owned
clients and storage rather than credentials or exporters. Production deployments provide those
ports and may host the generic Fetch boundary in their chosen stack; the protocol, transaction,
and conformance behavior remain unchanged. See
[Control-plane trust and recovery](../../docs/control-plane.md).
