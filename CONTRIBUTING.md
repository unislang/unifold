# Contributing to Unifold

## Start here

Use Node.js 22.14 or newer and the pnpm version pinned in `package.json`. Install from the workspace root so every dependency is represented in the shared lockfile.

```sh
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install
```

Do not copy dependencies into packages or rely on implicit workspace linking. Internal package dependencies use `workspace:` ranges; external dependencies are exact at the workspace policy layer and intentionally ranged only when they are public peer dependencies.

## Package conventions

Packages are ESM and use NodeNext module resolution. Relative imports in TypeScript include the emitted `.js` extension. A typical package provides:

- `src/index.ts` as the only default public boundary;
- explicit `exports` entries for additional supported boundaries;
- a composite `tsconfig.json` extending `../../tsconfig.base.json`;
- `build`, `typecheck`, and `test` scripts;
- repository metadata with its `packages/<name>` directory;
- a package README covering concepts, setup, API, accessibility, testing, and migration impact appropriate to its current surface.

Do not deep-import another package's `src` directory. Add a deliberate public export or narrow the dependency instead.

Package, application, and example feature modules must not import an API only to re-export that
local binding, either by name or as the default export (for example,
`import { defineWidget } from "owner"; export { defineWidget };`). Consumers import the owning public
package directly. A feature module may expose a meaningfully owned operation that combines the
dependency with feature behavior; package entry points may continue to declare their intentional
direct public export map.

## Required checks

Run these before requesting review:

```sh
pnpm format:check
pnpm quality:files
pnpm quality:tests
pnpm quality:reexports
pnpm lint
pnpm typecheck
pnpm quality:deps
pnpm quality:unused
pnpm test
pnpm test:coverage
pnpm build
```

Release preparation additionally runs `pnpm quality:duplication`, clean-consumer installation, documentation checks, conformance suites, and provenance/SBOM generation as those capabilities land.

The limits are mandatory:

- cyclomatic complexity is at most 3 per function or method;
- a function or method is at most 30 logical source lines;
- an authored non-Markdown file is at most 350 physical lines;
- inline disables and per-file overrides cannot suppress those limits.

Generated dependency lockfiles are retained for reproducibility and are not authored source. They
are the sole line-count exception besides Markdown; source maps, generated schemas, and build output
do not gain an exemption merely by being generated.

Refactor around cohesive responsibilities. Do not create pass-through functions or fragment concepts solely to satisfy a metric.

## Tests and documentation

Package unit tests are colocated under `src` or `scripts`: `feature.ts` has exactly one
`feature.test.ts`, and `generate.mjs` has exactly one `generate.test.mjs`.
Keep focused fixtures beside them as `feature.test-data.ts`. The `quality:tests` gate rejects package
unit tests outside `src` or `scripts` and tests without a same-directory source module. Cross-package
integration tests and Playwright E2E specifications remain in `tests/` because they exercise public
boundaries, not one implementation module.

The gate covers the `.ts` package sources and registered `.mjs` package scripts executed by the
current test runners. Declaration-only modules and named `*.test-data.*` support modules are the only
source exceptions. A new source-module format must add runtime and typecheck discovery in the same
change; generated files belong outside `src` and do not create an implicit testing exemption. A
package that adds an `.mjs` script suite must also register it with the root `test:scripts` command.

The root `typecheck` command compiles both publishable package sources and every package test project.

Test observable contracts, including positive, negative, cancellation, recovery, and accessibility behavior. Tests import directly from `vitest`; browser conformance belongs in the public Playwright harness.

Documentation is part of the implementation. A public API, event, JSON field, CLI option, behavior change, or deprecation requires matching versioned documentation and migration impact. Examples must compile and use public package exports only.

## Changesets

Add a Changeset for any consumer-visible change:

```sh
pnpm changeset
```

Use `patch` for compatible fixes, `minor` for compatible additions, and `major` for breaking contract changes. State why a change matters to consumers rather than restating file edits.

## Architectural boundaries

- Contracts and the intermediate representation cannot depend on rendering or product implementations.
- Components emit intents; the authoritative state transaction emits resulting state and commands.
- XState coordinates workflows but does not manipulate the DOM.
- Adapters protect real replaceability boundaries and cannot introduce a second state authority.
- Optional Angular, AI, Studio, and control-plane packages cannot become core runtime requirements.

Record a decision before adding custom infrastructure where maintained OSS already supplies the capability. Include license, security, health, footprint, interoperability evidence, fallback, and ownership.
