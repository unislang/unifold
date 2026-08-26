# @unislang/unifold-devtools

Framework-neutral, bounded, privacy-aware inspection for the canonical Unifold runtime. The
package records a finite event/transaction timeline, projects the normalized node graph without
exporting non-public values, filters correlation and scope chains, creates deterministic JSON Patch
document diffs, and replays data-only patch plans with fingerprints and host validation.

The session is a read-only runtime consumer. It never becomes a state authority, does not retain an
unbounded event history, never invokes recorded effects during replay, and is not a durable audit
store. Studio rendering, component highlighting, transport, persistence, and vendor telemetry are
host responsibilities.
