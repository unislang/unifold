# Server-sequenced collaboration

`@unislang/unifold-collaboration` defines the framework-neutral boundary for collaborative document
authoring. The browser does not assign authoritative actors, tenants, revisions, or permissions.
The host authenticates a caller, authorizes an exact resource, and supplies a trusted
`CollaborationActorContext` separately from the JSON request.

## Protocol

Every request uses protocol `1.0.0`, a request and correlation ID, and one closed operation:

- `proposal.submit` carries a branch, immutable base revision, intent, affected stable IDs, an
  idempotency key, and at most 256 bounded RFC 6902 operations.
- `proposal.approve` approves one exact candidate revision; stale approvals are conflicts.
- `proposal.comment` records review discussion without changing the document.
- `revision.publish` publishes only the exact current head permitted by branch policy.
- `revision.undo` creates a new compensating revision; it never deletes history.
- `presence.update` records short-lived cursor, selection, and draft state outside document history.

The exported Draft 2020-12 schema rejects unknown fields, including caller-supplied actor or tenant
identity. Runtime validation additionally rejects prototype-sensitive keys, malformed JSON
pointers, unsafe framework-owned `revision` or stable `id` writes, non-finite or excessively deep
JSON, oversized requests, and invalid patch shapes. A required host validation port applies the
full document schema and policy checks to every candidate before commit.

## Revisions, conflicts, and governance

The reference service assigns monotonically increasing immutable revisions. A proposal based on an
older ancestor is automatically rebased only when every intervening changed path is disjoint.
Overlaps produce structured `same-path`, `ancestor-overlap`, `delete-edit`, `machine`, `semantics`,
`accessibility`, or `policy` conflicts. Array-structural changes use their parent as a conservative
conflict footprint.

Protected branches can require an exact number of distinct assigned reviewers, separate author and
reviewer identities, and expiring approvals. The approved candidate commits only if its parent is
still the branch head. Publication requires the exact committed head and, on protected branches,
the proposal's approvals. Comments, approval facts, revision facts, and publication facts enter a
bounded tenant-filtered event log whose resume API reports retention gaps explicitly.

## Control-plane integration

`authorizeCollaborationActor()` in `@unislang/unifold-control-plane` projects only capabilities that
are both present in a trusted session and allowed by the configured object-authorization port for
the supplied resource. The resulting actor context is immutable and can be passed to
`ReferenceCollaborationService.execute()`. Requests never contain identity or capability fields.

The bundled state, event, and presence implementations are deterministic conformance adapters, not
production persistence. A production deployment must supply atomic revision/proposal/outbox/audit
transactions, multi-instance sequencing, durable idempotency, external authorization, encrypted
backup/restore, transport session and CSRF controls, quotas, and availability/recovery evidence.

## Verification

The package suite validates the published schema, every operation shape and dispatch path,
cross-tenant and capability denial, idempotent replay/collision, immutable snapshots, all conflict
classes, governance, compensating undo, event gaps, and ephemeral presence. Focused coverage is
98.30% lines, 91.53% branches, and 98% functions.

The performance fixture commits exactly 1,000 sequential revisions, then submits one disjoint
proposal based on the original revision across the full history. Twenty local samples on
2026-08-25 measured 60.40 ms p95 for the commit batch against a 1,000 ms limit and 4.20 ms p95 for
the rebase against a 100 ms limit. Every sample also requires the exact final revision sequence,
document values, accepted statuses, and `rebased` state. These timings are developer-workstation
observations until ratified on the pinned release runner.

```sh
pnpm --filter @unislang/unifold-collaboration test
pnpm exec tsc -p packages/collaboration/test/tsconfig.json --pretty false
pnpm exec vitest run --config tests/performance/vitest.config.ts tests/performance/collaboration.test.ts
pnpm benchmark:selective
```
