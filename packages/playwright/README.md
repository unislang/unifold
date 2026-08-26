# `@unislang/unifold-playwright`

The browser-level conformance kit for Unifold applications and exports. It extends Playwright instead of replacing it and delegates automated accessibility analysis to `@axe-core/playwright`.

Import `test` and `expect` from this package to receive the `unifold` fixture. The fixture captures
the bubbling `unifold-event` trusted ingress event, locates elements through accessible semantics or
`data-unifold-node-id`, and compares `data-unifold-render-count` diagnostics to verify selective
updates. Captured DOM events may contain interaction values; use only controlled test data and scan
retained traces or reports independently. Application integrations should subscribe to the
classification-aware, public-safe `runtime.events$` stream instead. See
[runtime event disclosure](../../docs/event-disclosure.md).

Call `unifold.assertAccessibility()` after custom setup or dynamic updates to reject serious and
critical axe findings without defining a full declarative scenario. `run()` performs the same scan
using the scenario's declared forbidden impacts.

Use `createUnifoldPlaywrightConfig` for the supported Chromium, Firefox, and WebKit matrix. Axe results supplement explicit keyboard, focus, and manual assistive-technology evidence; they do not establish WCAG conformance by themselves.
