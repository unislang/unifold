# Hierarchical site example

This runnable web project validates Unifold's original hierarchy-oriented authoring goal. Its page
source is [`src/ui.json`](./src/ui.json); reviewed layout definitions live separately in
[`src/layouts.json`](./src/layouts.json). The host snapshots those definitions into a trusted layout
registry and passes it through the public mount API. The example uses `layoutType`, typed `variables`,
`type`, `props`, `children`, and named `events`, then lowers that source to canonical JsonUI, compiles
normalized IR, renders Web Components, evaluates an incremental rule, routes a source-specific event
through a named guard into an XState actor, publishes Schema.org JSON-LD, and exposes the unified
runtime stream. The guard reads the current normalized consent snapshot through a trusted host
registry; the JSON document contains only its portable name.

```powershell
pnpm --filter @unislang/unifold-hierarchical-example dev
```

Open the printed local URL. The summary button begins disabled, becomes enabled when consent is
checked, and changes the workflow state and status after activation. The inspector shows the latest
canonical event.

The companion `@unislang/unifold-hierarchical-example-e2e` workspace builds this project and runs
functional, selective-update, semantic, workflow, stream, and axe-core assertions in Playwright.
