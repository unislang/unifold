# @unislang/unifold-devtools

Framework-neutral, bounded, privacy-aware inspection for the canonical Unifold runtime. The
package records a finite event/transaction timeline, projects the normalized node graph without
exporting non-public values, filters correlation and scope chains, creates deterministic JSON Patch
document diffs, and replays data-only patch plans with fingerprints and host validation.

The session is a read-only runtime consumer. It never becomes a state authority, does not retain an
unbounded event history, never invokes recorded effects during replay, and is not a durable audit
store. Studio rendering, component highlighting, transport, persistence, and vendor telemetry are
host responsibilities.

## Portable application replay

`fixtures/portable-application-replay.json` is the versioned cross-package replay oracle. It pins
the authored JSON document, exact machine definitions and versions, initial normalized snapshot,
finite clock and randomness sequences, canonical input events, and explicit mocked-effect receipts.
Its colocated test validates the fixture against
`schemas/portable-application-replay.schema.json`, drives the real runtime and XState adapter twice,
and requires byte-equivalent snapshots, machine states, public event projections, effect calls, and
control consumption. No wall clock, random generator, network, or provider is consulted.

Mock effect receipts retain the runtime-assigned `effectId`, which joins a replayed invocation to its
command/request/settlement lifecycle without re-running the external provider. Metadata-only privacy
projection retains only the effect `commandType` and optional target node ID; provider errors,
credentials, inputs, results, and arbitrary nested change fields are discarded.
