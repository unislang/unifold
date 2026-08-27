# Packaging and clean-consumer verification

`@unislang/unifold` is the supported application facade. The clean-consumer gate computes its exact
production dependency closure from package manifests instead of maintaining a second hand-written
package count. Every package in that closure is packed and inspected before the consumer is run.

## Executable release proof

Run the clean-consumer gate with:

```sh
pnpm test:consumer
```

The gate builds the workspace, computes the facade dependency closure from package manifests, and
packs every package in that closure. It copies a consumer fixture into an operating-system temporary
directory outside the repository, installs only the generated tarballs, and rejects any workspace,
link, file, or repository resolution in the installed packages.

The installed consumer must pass all of these checks:

- every declared export resolves to a packaged file;
- declaration and JavaScript source maps resolve to packaged source or embedded source content;
- tests, test helpers, and TypeScript build caches are absent from tarballs;
- strict consumer TypeScript compilation succeeds through public exports;
- a production Vite build succeeds; and
- Chromium mounts JSON, emits a canonical input transaction, preserves dirty control state across a
  JSON update, resolves theme tokens, and disposes the application.

The generated-adopter gate additionally packs `@unislang/unifold-cli` and its computed runtime,
theme, and Playwright closure. Outside the repository it installs the binary, generates the vanilla
starter, validates its hierarchical JSON through the public compiler, creates and validates a
versioned module project, and flattens it to a locked runtime artifact. The generated app imports
that artifact without a runtime fetch. Two isolated flatten operations must emit byte-identical
artifact and lock files; the installed module/export packages then verify the lock schema,
artifact/IR hashes, portable JSON, and static HTML before the unit test, strict typecheck, production
Vite build, and Chromium Playwright accessibility/selective-update journey. Only packed Unifold
artifacts are installed. Starter
generation is atomic, never overwrites a target, and rejects traversal or junction-resolved escape
before creating an outside path.

The CLI implements document `validate`, `generate starter --no-install`, and pinned `module
validate`/`module flatten` workflows. Module output is deterministic, refuses unsafe or existing
paths, and includes a validated lock tying the selected export, exact module graph, expanded
document integrity, and prepared IR integrity together. The CLI deliberately does not claim the
planned `migrate`, `test`, `export`, or `doctor` commands.

`pnpm release:check` includes quality, unit, performance, browser, clean-consumer, duplication, and
format gates. `pnpm release` runs that complete gate before Changesets can attempt publication.

## Current publication boundary

All packages deliberately remain `private: true` and at version `0.0.0`. The consumer proof therefore
installs every internal package tarball and supplies temporary pnpm overrides for the exact local
artifacts. This proves artifact integrity and runtime usability; it does not claim public-registry
installability.

Public publication remains blocked until the repository license is selected and ownership of the
`@unislang` npm scope is verified. After those policy decisions, add an ephemeral-registry journey
that publishes the closure and installs only `@unislang/unifold` plus the theme from that registry.
Also add npm and Yarn consumer parity, package-lint and type-resolution audits, provenance, SBOM, and
license-inventory gates before the first public release.
