# Unifold

Unifold is a framework for JSON-defined interfaces whose controls, components, forms, pages, and applications participate in one typed event and state model.

The repository is in Phase 0: executable contracts, feasibility proofs, and package boundaries come before catalog scale. The canonical repository is [unislang/unifold](https://github.com/unislang/unifold). Consumers mount and update applications through `@unislang/unifold`; lower-level capabilities use the `@unislang/unifold-*` package namespace.

## Workspace setup

Prerequisites:

- Node.js 22.14 or newer
- pnpm 10.15.1, pinned by the root `packageManager` field

```sh
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install
pnpm quality
pnpm test
pnpm build
```

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before changing a public contract. The architecture and implementation plan remains the source of truth for package responsibilities and Phase 0 exit gates.
The current durable-format matrix and exact rejection/migration policy are documented in
[Version compatibility](./docs/compatibility.md).

Reusable JSON structures are authored as exact-version compositions with structural parameters,
declared slots, typed exports, and provenance, then expanded into the same IR/event/state path as
direct nodes. See [Reusable JSON compositions](./docs/compositions.md) for the executable contract
and current limitations.

The initial `@unislang/unifold-ai` integration produces guarded, approval-aware JSON Patch proposals
through Vercel AI SDK models, while `@unislang/unifold-export` creates deterministic portable JSON
prototype artifacts. See [AI proposals and prototype export](./docs/ai-and-export.md).

Authenticated revisions and external effects can use the separately deployable
`@unislang/unifold-control-plane` protocol. Its Phase 0 reference adapter proves trusted
session-derived tenancy, deny-by-default authorization, idempotent registered effects, resumable
server sequences, bounded Fetch host/client transport, redacted audit metadata, and
integrity-verified restore without coupling the browser runtime to a server framework. See
[Control-plane trust and recovery](./docs/control-plane.md).

Collaborative authoring uses the versioned `@unislang/unifold-collaboration` protocol for immutable
server-sequenced revisions, conservative patch rebasing, structured conflicts, protected-branch
review, comments, compensating undo, resumable facts, and ephemeral presence. Trusted identity and
resource-authorized capabilities enter separately through the control-plane adapter. See
[Server-sequenced collaboration](./docs/collaboration.md).

Runtime and Studio inspection use the separate `@unislang/unifold-devtools` package. It consumes the
authoritative canonical stream into a finite timeline, projects normalized nodes according to data
classification, computes fingerprinted document diffs, and performs validated data-only replay
without running recorded effects. See [Runtime inspection and deterministic replay](./docs/devtools.md).

Remote query and mutation state uses the separately versioned `@unislang/unifold-data` protocol.
Trusted hosts register operation IDs; bounded query actors provide cancellation, stale-result
rejection, safe retry, optimistic rollback, offline last-known-good reads, Query Core caching, and
cross-context invalidation without allowing JSON to supply endpoints or identity. See
[Remote data sources](./docs/data-sources.md).

Every document uses the executable [`unifold-jsonui@1.0.0` profile](./docs/jsonui-profile.md), pinned
to an exact upstream commit. Unsupported upstream actions, stores, modifiers, validation, lists,
slots, and state export fail before IR generation instead of creating renderer-specific behavior.

The current native-backed component slice and its explicit limits are documented in
[Core components](./docs/components.md).

The initial `@unislang/unifold-forms` slice adds registered synchronous validation, a Standard
Schema adapter, input/blur/submit update policies, accessible error projection, and canonical valid
or invalid form results without introducing a second state store. Explicit reset and disable
commands preserve the same atomic aggregate and event guarantees for heterogeneous forms.
Form-level validator IDs extend that path to synchronous object and cross-field rules; the reference
application uses Valibot through Standard Schema and publishes affected component IDs on failures.
Registry output is stamped with its authoritative owner; aggregate-owned issues are indexed by
`affectedIds` so unchanged target controls are selectively reprojected without copying the issue
into their control state.
Async validator IDs use the same authoritative control graph. XState promise actors provide
`AbortSignal` cancellation, request IDs prevent stale commits, and lifecycle facts expose starts,
completions, cancellations, and operational failures through the unified stream.

JSON-defined workflow machines compile to live XState v5 actors. They consume the same indexed
canonical stream and can select only host-registered typed commands, which re-enter the sole runtime
transaction boundary with explicit correlation and causation. See
[JSON workflows with XState](./docs/workflows.md).

The bubbling DOM `unifold-event` is trusted, value-bearing ingress for the application coordinator.
Public integrations subscribe to `runtime.events$`, whose classification-aware projection retains
source identity and causality while omitting non-public values and every store-write value. See
[Runtime event disclosure](./docs/event-disclosure.md).

## Repository layout

- `packages/` contains independently buildable framework packages. They remain private until the license and npm-scope gates are resolved.
- `packages/tooling/` owns shared quality configuration and the cross-format file-size check.
- `apps/` is reserved for product applications such as Unifold Studio.
- `examples/` is reserved for clean consumer examples; examples may use only public exports.
- `.changeset/` records consumer-facing release intent.

Artifact integrity is verified outside the workspace with `pnpm test:consumer`; the gate packs the
facade's full production closure, installs it into a temporary clean project, typechecks and bundles
the public API, and runs its lifecycle in Chromium. See
[Packaging and clean-consumer verification](./docs/packaging.md).

## Quality contract

Every project-owned function has cyclomatic complexity at most 3 and at most 30 logical source lines.
Every authored non-Markdown text file has at most 350 physical lines. Generated dependency lockfiles
are retained for reproducibility and excluded from that authored-source metric. Package unit tests are
colocated one-to-one by filename with their source modules. Inline suppressions do not waive these
limits.

TypeScript is strict and package boundaries are checked for cycles, undeclared dependencies, and forbidden implementation edges. Pull requests must also pass formatting, unused-code, duplication, tests, and project-reference builds.

## Package metadata

Before package publishing is enabled, manifests must include:

- a name under `@unislang/unifold-*`;
- ESM output, declarations, source maps, and explicit export maps;
- `sideEffects: false` unless a documented entry point intentionally performs registration;
- `https://github.com/unislang/unifold.git` and the package-relative repository directory;
- public provenance-enabled publishing configuration;
- explicit peer and runtime requirements.

The project license has not yet been selected. Packages must not be publicly published until that repository-wide decision and the `@unislang` npm scope ownership prerequisite are complete.
