# End-to-end verification

This suite exercises the built reference application through public browser behavior. It runs the
same journeys in Chromium, Firefox, and WebKit and checks composition expansion, keyboard operation,
interaction-event envelopes, selective rendering, runtime-owned form aggregates, Schema.org parity,
and axe-core findings. Its generic fixture captures the trusted, potentially value-bearing DOM
`unifold-event`; public-safe disclosure is asserted through `runtime.events$` in runtime integration
tests and any journey that explicitly exposes that stream.

The reference document authors `ProfileEditor@1.0.0` once and instantiates it as `profile-editor`.
Browser assertions use its deterministic expanded IDs, including `profile-editor::name` and
`profile-editor::slot:actions::submit`, while user interaction continues to use accessible labels
and roles. Exact reviewed edges to `2.0.0` and `3.0.0` prove mapped export preservation and
reset-by-default behavior; an unreviewed `4.0.0` candidate proves rejection and recovery. The
journey also requires renamed-node focus, semantic and canonical-event continuity, stable unaffected
DOM identity, and axe results.

The reference form also contains a select-only editable Combobox. Its dedicated journey proves
active-descendant keyboard navigation, disabled-option skipping, canonical selection and clearing,
local unmatched queries, Escape restoration, no-results status, selective projection, runtime event
identity, bounded option DOM, and axe results. The complete Chromium/WebKit matrix currently passes
81 cases with 3 intentional scale skips. On the managed Windows runner, focused Firefox cases fail
before page creation with Playwright's `_page` error; that is not behavioral evidence and remains an
external-runner release gate.

From the repository root, after installing dependencies and browser binaries:

```sh
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm exec playwright test --config tests/e2e/playwright.config.ts
```

The configuration builds the reference in explicit `e2e` mode and serves it on port 4173. Test hooks
are absent from production builds, and the production bundle checker rejects their markers. To test
an already running or exported application, set `PLAYWRIGHT_BASE_URL`; the built-in server is then
skipped.
