# Packed consumer proof

This test packs the complete production dependency closure for `@unislang/unifold` plus the theme,
installs only those tarballs into an operating-system temporary directory outside the monorepo, and
then runs a strict TypeScript check, production Vite build, and Chromium Playwright journey.

```sh
pnpm test:consumer
```

The fixture imports only documented package exports. It proves JSON compilation, explicit element
registration, mounting, canonical runtime events, selective input projection, dynamic document
update with dirty-value retention, disposal, and theme CSS resolution. The test also rejects leaked
workspace references, repository links, build caches, missing export targets, broken source maps, or
installed packages that resolve back into the repository.

The generated-starter journey also uses the packed `unifold` binary to validate and flatten a
versioned module project. It rewires the generated application to the emitted locked artifact, then
requires two independent flatten operations to produce byte-identical artifacts and locks. The lock
schema, artifact/IR hashes, portable JSON, and static HTML are verified before unit, strict
TypeScript, production Vite, Chromium interaction, and accessibility checks run against the artifact.

The packed element artifact is expanded into two physical package directories before the browser
build. The journey verifies distinct component constructors over one shared Lit runtime,
same-release idempotence, different-release iframe rejection without partial registration, and a
successful public-facade mount after registration. This keeps duplicate-package compatibility in
the release gate instead of relying only on synthetic registries or workspace module deduplication.

The same command also copies the plain DOM, React, Vue, and Svelte parity workspace into a second
temporary consumer, installs the facade, theme, Playwright kit, and their complete internal closures
from tarballs, and reruns its type checks, Svelte diagnostics, production build, unit contracts, and
Chromium journey. Declaration maps must resolve entirely inside the installed tarballs.

Because the packages remain private and versioned `0.0.0`, the temporary consumer uses tarball
overrides for their internal exact dependencies. A later ephemeral-registry test must prove that a
consumer can install only the facade once license, public-package, versioning, and npm-scope decisions
are approved.
