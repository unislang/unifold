# @unislang/unifold-collaboration

Framework-neutral collaboration contracts and a replaceable in-memory conformance service for
server-sequenced immutable document revisions.

JSON requests carry proposal, branch, base-revision, correlation, idempotency, affected stable-ID,
and RFC 6902 patch data. Trusted actor, tenant, type, and capability context is supplied separately
by the host and cannot be asserted by document or request JSON. Runtime validation adds pointer,
prototype-safety, depth, member-count, operation-count, and encoded-size ceilings to the published
Draft 2020-12 schema.

The reference service supports conservative disjoint-path rebasing, structured same/ancestor,
delete/edit, machine, semantic, accessibility, and policy conflicts, protected branches, assigned
reviewers, separation of duties, expiring approvals, exact-revision publication, comments,
idempotent replay, compensating undo revisions, bounded resumable events with explicit gaps, and
tenant-scoped ephemeral presence. Candidate documents pass a required host validation port before
they can become revisions.

The bundled storage and presence implementations are conformance evidence. Production deployments
remain responsible for durable transactions, external authorization, signed audit, transport,
multi-instance sequencing, backup/restore, and availability objectives.
