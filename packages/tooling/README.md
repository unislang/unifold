# `@unislang/unifold-tooling`

Shared, no-waiver repository policy for Unifold. The package exports ESLint, Prettier, TypeScript, and dependency-cruiser configuration plus the `unifold-check-file-lines` executable.

The executable checks every non-binary, project-owned file it encounters. Markdown is the only text-format exemption. Dependency directories and build output are outside project ownership and are skipped.

```sh
pnpm quality:files
pnpm quality:tests
pnpm lint
pnpm quality:deps
```

`quality:tests` enforces one `src/feature.test.ts` for every `src/feature.ts` and the equivalent rule
for package `scripts`. Explicit `*.test-data.*` support and declaration-only modules are exempt. The
gate accepts only the `.ts` and `.mjs` formats exercised by the current runners, and it rejects
centralized, orphaned, and `.spec` tests. New `.mjs` script suites must also be registered with the
workspace `test:scripts` command so filename compliance cannot replace runtime execution.

The custom code is intentionally limited to cross-format physical-line counting. ESLint, TypeScript, dependency-cruiser, Knip, jscpd, Vitest, and Changesets retain responsibility for their established capabilities.
