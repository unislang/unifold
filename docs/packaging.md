# Packaging and clean-consumer verification

`@unislang/unifold` is the supported application facade. Its production dependency closure currently
contains fourteen packages: the facade, catalog, compositions, contracts, elements, events, forms,
IR, JsonUI profile, reactivity, DOM renderer, runtime, theme, and XState integration.

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
