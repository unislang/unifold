# `@unislang/unifold-cli`

The supported command-line boundary for Unifold documents and generated projects. It coordinates
public package APIs and never carries alternate compiler or renderer behavior.

Validate either hierarchy-oriented or canonical JsonUI-shaped authored JSON:

```sh
unifold validate src/ui.json
```

Validation reads at most 2 MiB, parses JSON, and calls `prepareUnifoldDocument()` from
`@unislang/unifold`. Failures are emitted as bounded JSON diagnostics with their original stage,
code, and JSON Pointer.

Validate, check, or deterministically flatten a pinned `UiModule@1.0.0` project:

```sh
unifold module validate modules.project.json
unifold module check modules.project.json --lock dist/ui.module.lock.json
unifold module flatten modules.project.json \
  --output dist/ui.module.json \
  --lock dist/ui.module.lock.json
```

The project manifest names only bounded local source files. Resolution verifies exact module IDs,
versions, integrity hashes, namespaces, graph limits, and the selected export before passing the
expanded document through the public preparation boundary. Flattening refuses traversal,
symlink-resolved escape, duplicate output paths, and overwrite; it emits deterministic runtime and
lock artifacts with document and prepared-IR integrity evidence.

Both advertised contracts are strict Draft 2020-12 JSON Schemas and are exported for editor,
generator, and CI reuse:

```text
@unislang/unifold-cli/schemas/ui-module-project.schema.json
@unislang/unifold-cli/schemas/ui-module-build.schema.json
```

The package compiles each schema once with Ajv in strict mode. Project loading and generated build
output validation use those same validators, so runtime acceptance cannot silently drift from the
published schema artifacts.

Check a committed lock in CI without writing or updating it:

```sh
unifold module check modules.project.json --lock dist/ui.module.lock.json
```

Checking resolves and compiles the project through the same public module-project boundary, creates
and validates the deterministic expected lock, then schema-validates and structurally compares the
committed lock. The lock must be a bounded regular file whose physical path remains within the
project root. Invalid, missing, escaping, or stale locks fail with nonzero CLI status; the command
never repairs or replaces them.

Validate a static UiModule project manifest without following runtime URLs:

```sh
unifold module validate modules.project.json
```

The manifest pins one exact module ID/version/export and lists reviewed relative module sources.
Each source is bounded to 1 MiB, must remain inside the project root after symlink resolution, and
is admitted through `@unislang/unifold-modules`. Imports then enforce their authored SHA-256 pins,
namespaces, graph limits, cycle checks, composition references, and resource limits before the
resolved document is compiled through the public Unifold preparation path.

Generate a deployable composed document plus an exact module/IR lock:

```sh
mkdir dist
unifold module flatten modules.project.json \
  --output dist/ui.module.json \
  --lock dist/ui.module.lock.json
```

Flattening writes both files through private sibling staging paths and refuses traversal, symlink
escape, identical targets, or overwrite. The artifact retains the canonical composed document for
ordinary `mountUnifoldApplication()` use, its expanded-document integrity, IR integrity, namespaced
resources, and source map. The validated lock records the exact entry and sorted module graph.

Generate a deterministic vanilla TypeScript/Vite starter below the current directory:

```sh
unifold generate starter my-unifold-app --no-install
cd my-unifold-app
pnpm install
pnpm test
pnpm build
pnpm test:e2e
```

The initial generator intentionally performs no dependency installation. It rejects the current
directory, traversal, parent symlinks outside the workspace, invalid package names, and every
existing target. Files are prepared in a private sibling staging directory and renamed into place,
so failed generation cannot expose a partial target.

The starter uses exact Unifold package versions, hierarchy-oriented JSON, accessible native-backed
components, token styling, `runtime.events$`, an XState command, Schema.org JSON-LD, strict
TypeScript, CSP guidance, a colocated unit test, and the public Playwright accessibility harness.
The generated browser journey serves a production Vite build, so same-origin style policy is
exercised without development-time injection and the resolved Unifold theme token is asserted. The
starter documents the current Ajv-generated validator requirement for explicit `unsafe-eval` in
`script-src`; it does not misrepresent the current runtime as strict-CSP compatible.
