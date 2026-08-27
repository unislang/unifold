# `@unislang/unifold-tooling`

Shared, no-waiver repository policy for Unifold. The package exports ESLint, Prettier, TypeScript, and dependency-cruiser configuration plus the `unifold-check-file-lines` executable.

The executable checks every non-binary, project-owned file it encounters. Markdown is the only text-format exemption. Dependency directories and build output are outside project ownership and are skipped.

```sh
pnpm quality:files
pnpm quality:tests
pnpm quality:reexports
pnpm lint
pnpm quality:deps
```

`quality:tests` scans every project under `packages`, `apps`, and `examples`. It enforces one
`src/feature.test.ts` for every `src/feature.ts` and the equivalent rule for `scripts`. Explicit
`*.test-data.*` support and declaration-only modules are structurally exempt. Root configuration
files are outside the implementation directories and are not treated as source modules. The small
exact-path exception list in [`colocated-test-policy.mjs`](src/colocated-test-policy.mjs) records a
reason for each browser bootstrap, type-only companion, or data-only test fixture that cannot have
a meaningful isolated unit test. Basename patterns and directory-wide waivers are not supported.
Deleting or renaming an exempt source without removing its policy entry fails the gate.

`quality:reexports` scans non-test TypeScript source under `packages`, `apps`, and `examples`. It
rejects a feature module that imports a local binding and then exports that same binding through a
local named or default export. This prevents ownership aliases such as the former
`popover-reference.ts` pattern. Direct package export maps remain the intentional public-boundary
mechanism.

The gate accepts only the `.ts` and `.mjs` formats exercised by the current runners, and it rejects
centralized, orphaned, and `.spec` tests. New `.mjs` script suites must also be registered with the
workspace `test:scripts` command so filename compliance cannot replace runtime execution.

The custom code is intentionally limited to cross-format physical-line counting. ESLint, TypeScript, dependency-cruiser, Knip, jscpd, Vitest, and Changesets retain responsibility for their established capabilities.
