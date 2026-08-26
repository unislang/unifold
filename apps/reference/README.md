# Unifold reference application

This application mounts `src/ui.json` through the public `@unislang/unifold` coordinator and records
the canonical event stream. It proves the Phase
0 path from a JSON definition through accessible Web Components to form
submission. Its composition also exercises text-area, checkbox, radio-group, select, combobox,
multi-select, and accordion controls
through the same event and state path. A JSON-declared form validator uses Valibot through Standard
Schema to prove synchronous cross-field invalidation, correction, and recovery without a second
form store. Nested Box, Stack, and Grid primitives prove token-backed structural composition without
changing descendant identity or event routing. A labeled Lucide-backed Icon, escaped Text, native
Heading, live-region Alert, and safe Link primitives prove semantic content rendering and canonical
activation. The same JSON document declares a `Person` semantic graph whose name is compiled from
the committed visible control into one deterministic
Schema.org JSON-LD block.

The document also declares a scope-owned XState workflow. A valid form fact transitions it from
editing to submitted and selects a trusted command that changes the submit-button label through the
normal runtime. The Playwright journey verifies both selective DOM behavior and the causal event
chain.

```sh
pnpm --filter @unislang/unifold-reference dev
```

The preview command serves the production build on `127.0.0.1:4173` for the
Playwright package.

The E2E-only prototype hook applies revised authored JSON through the same public update API. It is
used to prove dynamic composition insertion, keyed identity and focus preservation, the canonical
reconcile event, semantic parity, and last-known-good rejection behavior.
