# Hierarchical site example

This runnable web project validates Unifold's original hierarchy-oriented authoring goal. Its page
and reviewed layout definition are separate, statically authored `UiModule@1.0.0` sources under
[`src/modules`](./src/modules). The application imports the layout module by exact version,
integrity, and namespace; the resolver builds the trusted layout registry and deterministic
artifact before mounting. The example uses `layoutType`, typed `variables`,
`type`, `props`, `children`, and named `events`, then lowers that source to canonical JsonUI, compiles
normalized IR, renders Web Components, evaluates an incremental rule, routes a source-specific event
through a named guard into an XState actor, publishes Schema.org JSON-LD, and exposes the unified
runtime stream. The guard reads the current normalized consent snapshot through a trusted host
registry; the JSON document contains only its portable name.

Production and E2E builds run the packaged `unifold module check` against the committed module lock
before compilation. The artifact hash covers its composed and expanded documents, graph, resources,
and exact source map; the lock separately pins prepared IR. Drift therefore fails without rewriting
the lock.

```powershell
pnpm --filter @unislang/unifold-hierarchical-example dev
```

Open the printed local URL. The summary button begins disabled, becomes enabled when consent is
checked, and changes the workflow state and status after activation. The inspector shows the latest
canonical event.

The companion `@unislang/unifold-hierarchical-example-e2e` workspace builds this project and runs
functional, module-integrity, selective-update, semantic, workflow, stream, and axe-core assertions
in Playwright.
