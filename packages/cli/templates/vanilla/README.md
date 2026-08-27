# Unifold starter

Install dependencies and verify the generated project:

```sh
pnpm install
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e --project chromium
```

Run `pnpm dev` to edit the hierarchy-oriented `src/ui.json`. It selects an exact local
`layoutType`/`layoutVersion`, mounts through the public Unifold facade, publishes every meaningful
change through `application.runtime.events$`, and lets XState issue a selective status patch.

The checked-in CSP keeps scripts and styles same-origin. The current runtime schema compiler uses
Ajv-generated validation functions, so `script-src` explicitly includes `unsafe-eval`; remove that
token only after selecting a precompiled validator build that passes the same document corpus. The
production Playwright journey proves token CSS under `style-src 'self'`. Add origins only for
reviewed production adapters, and never place provider credentials in the browser or authored JSON.

This starter is ordinary source code. “Ejecting” means removing the CLI from your development
workflow—the generated application has no runtime dependency on it. Export prototypes through
`@unislang/unifold-export` when that package is intentionally added.
