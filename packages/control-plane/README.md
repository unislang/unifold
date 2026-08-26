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

`createReferenceControlPlane()` supplies a shared-schema/tenant-key in-memory adapter for local
development and the conformance suite. It denies absent grants, scopes every key by the trusted
tenant, imposes document and realtime-retention limits, detects sequence gaps, canonicalizes effect
requests with RFC 8785 before SHA-256 hashing, excludes effect values from audit details, and checks
backup integrity before restore.

`createControlPlaneHttpHandler()` exposes the service through the standard Fetch `Request` and
`Response` contract without choosing a server framework. It accepts only `POST application/json`
at the configured path, reads UTF-8 incrementally under a byte limit, rejects unknown fields and
prototype-sensitive or excessive JSON, maps protocol statuses deterministically, sets `no-store`
and `nosniff`, forwards cancellation to effects, and converts unexpected failures to one safe error.
`createControlPlaneHttpClient()` applies the corresponding request and response limits, validates
the result envelope and HTTP status agreement, and classifies cancellation, unavailability,
oversize, and invalid responses without exposing transport causes.

`createControlPlaneRealtimeCursor()` uses any `resumeRealtime` service, including the Fetch client.
It advances only after a safe, contiguous, single-tenant sequence; explicit gaps leave the cursor
unchanged until the host rereads authoritative state and calls `resetAfterAuthoritativeRead()`.

`authorizeCollaborationActor()` bridges an already trusted session to the collaboration protocol.
It asks the configured object-authorization port about each collaboration capability present in
the session for an exact resource and returns only allowed capabilities in an immutable actor
context. It does not bypass grants or accept identity from collaboration JSON.

The reference adapter is not a production identity system, database, durable outbox, distributed
lock, encrypted backup service, message broker, or push connection server. Production deployments
replace its ports and may host the generic Fetch boundary in their chosen stack; the protocol and
conformance behavior remain unchanged. See
[Control-plane trust and recovery](../../docs/control-plane.md).
