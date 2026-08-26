# End-to-end verification

This suite exercises the built reference application through public browser behavior. It runs the
same journeys in Chromium, Firefox, and WebKit and checks composition expansion, keyboard operation,
interaction-event envelopes, selective rendering, runtime-owned form aggregates, Schema.org parity,
and axe-core findings. Its generic fixture captures the trusted, potentially value-bearing DOM
`unifold-event`; public-safe disclosure is asserted through `runtime.events$` in runtime integration
tests and any journey that explicitly exposes that stream.

The reference document authors `ProfileEditor@1.0.0` once and instantiates it as `profile-editor`. Browser assertions use its deterministic expanded IDs, including `profile-editor::name` and `profile-editor::slot:actions::submit`, while user interaction continues to use accessible labels and roles.

From the repository root, after installing dependencies and browser binaries:

```sh
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm exec playwright test --config tests/e2e/playwright.config.ts
```

The configuration builds and serves `@unislang/unifold-reference` on port 4173. To test an already running or exported application, set `PLAYWRIGHT_BASE_URL`; the built-in server is then skipped.
