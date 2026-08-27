# Version compatibility

The current workspace is a prerelease Phase 0 line. Package manifests intentionally remain private
at `0.0.0`; that package placeholder is not a durable-format version. Compatibility is decided by
the explicit versions embedded in each JSON or protocol contract and by the executable validators.

| Boundary                      | Accepted version       | Compatibility behavior                                                                       |
| ----------------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| `UiDocument` schema           | `1.0.0`                | Exact; other inputs require a host-registered migration path before compilation              |
| `UiModule` schema             | `1.0.0`                | Exact imports pin module ID, version, SHA-256 integrity, and namespace                       |
| Signed document envelope      | `1.0.0`                | Exact; signature covers original payload bytes before parsing or migration                   |
| JsonUI profile                | `unifold-jsonui@1.0.0` | Exact profile pinned to upstream `0.10.25` commit `5401b3d4900ca3032c108d6db00e8a819f4b28e9` |
| Core catalog                  | `unifold-core@1.0.0`   | Exact release; incompatible catalog majors require another realm                             |
| Unifold IR                    | `1.1.0`                | Compiler output only; `1.1.0` adds collection behavior to the `1.0.0` render model           |
| Store definition              | `1.0.0`                | Exact schema; adapter data version must satisfy the document's inclusive range               |
| Composition contract/manifest | `1.0.0`                | Exact definitions and instance provenance                                                    |
| Workflow machine              | `1.0.0`                | Exact portable definition; XState internal snapshots are not a portable contract             |
| Derived rule                  | `1.0.0`                | Exact closed JSON Logic profile                                                              |
| Semantic graph                | `1.0.0`                | Exact graph contract with Schema.org release `30.0` vocabulary                               |
| Canonical event envelope      | CloudEvents `1.0`      | Exact envelope; each event type carries its own version suffix                               |
| Data protocol                 | `1.0.0`                | Exact schema and operation vocabulary                                                        |
| Control-plane protocol        | `1.0.0`                | Exact request shape over the bounded Fetch adapter; trusted context is derived server-side   |
| Collaboration protocol        | `1.0.0`                | Exact request/event vocabulary and schema                                                    |
| Devtools replay protocol      | `1.0.0`                | Exact closed replay-plan schema                                                              |
| Static export manifest        | `1.0.0`                | Exact integrity-manifest format                                                              |
| Test scenario                 | `1.0.0`                | Exact data-only scenario contract                                                            |

Exact means an unsupported value fails validation; it is never interpreted as the nearest known
version. Additive contract work must introduce the semantically appropriate minor version and
compatibility evidence. Renames, removals, or changed meaning require a major version and an explicit
reviewed migration or a documented rejection boundary.

The compiler emits `UnifoldIr@1.1.0`. Existing `1.0.0` renderer fixtures remain valid evidence for
the unchanged node/render model, while `1.1.0` adds the canonical `collectionBehaviorsById` map.
Persist authored JSON rather than IR and regenerate module IR-integrity locks after compiler upgrades.

## Migration support

`UiDocument@1.0.0` is the first contract candidate, so the framework intentionally ships no legacy
edge. The generic trusted migration engine is nevertheless executable: it records exact edges,
clones each input/output, rejects missing/duplicate/cyclic or longer-than-sixteen paths, contains
exceptions, rejects unsafe or oversized intermediate JSON, and compiles the final target version.
An actual successor contract must add its pure migration, golden input/output, failure and recovery
fixtures, supported input range, and rollback guide in the same release.

Store adapter ranges are compatibility checks, not executable data migrations. Workflow definitions
are portable but XState library snapshots are not; persisted workflow-state migration or safe discard
remains a future release requirement.

## Executable checks

```sh
pnpm quality
pnpm test
pnpm test:coverage
pnpm test:jsonui-parity
pnpm test:consumer
```

Schema enum-agreement tests reject drift between TypeScript and JSON Schema. The JsonUI parity corpus
checks the exact upstream pin, package integrity, supported trees, and unsupported diagnostics. The
clean-consumer gate builds and installs packed artifacts so workspace source resolution cannot hide
an incompatible public closure.
