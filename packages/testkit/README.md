# `@unislang/unifold-testkit`

Data-only test scenarios and deterministic assertions shared by component, browser, export, and consumer tests.

Scenarios contain no callbacks or JavaScript source. They identify controls through accessible
semantics or stable Unifold node IDs, describe semantic actions, and declare expected `UiEvent`
sequences and selective updates. `defineScenario` performs inexpensive author-time validation;
schema validation remains the boundary for untrusted JSON.

Use `assertCanonicalEventSequence` to compare `UiEvent` sequences and `assertSelectiveUpdates` to
prove both the intended update and important non-updates. The assertion helper does not establish a
trust boundary: a sequence read from `runtime.events$` is public-safe, while the Playwright fixture's
DOM `unifold-event` capture is trusted, potentially value-bearing ingress.
