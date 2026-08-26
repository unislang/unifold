# Getting started

## Prerequisites

- Node.js 22.14 or newer
- pnpm 10.15.1 or newer through Corepack
- Git

Clone `https://github.com/unislang/unifold.git`, then run:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Run the JSON-defined reference form:

```sh
pnpm --filter @unislang/unifold-reference dev
```

Open `http://127.0.0.1:5173`. Enter a name and submit the form. The page exposes the same canonical events consumed by application state and by the Playwright conformance kit.

The reference also exercises native-backed text and choice controls, an accordion, semantic content,
safe Link activation, and nested token-backed Box, Stack, and Grid composition.
See [Core components](./components.md) for the current JSON vocabulary and its explicit limits.

The reference JSON defines `ProfileEditor@1.0.0`, supplies its field label as a structural parameter, and supplies its action button through a declared slot. The composition expands before normal IR compilation. See [Reusable JSON compositions](./compositions.md) before authoring or exporting composition-based documents.

Application hosts use the supported coordinator instead of wiring compiler, runtime, renderer, and
DOM-event plumbing independently:

```ts
import { UnifoldApplicationMountStatus, mountUnifoldApplication } from "@unislang/unifold";

const result = mountUnifoldApplication(authoredJson, container);
if (result.status === UnifoldApplicationMountStatus.Mounted) {
  const update = result.application.update(revisedAuthoredJson);
}
```

An update first expands and validates the complete authored definition, then preflights the renderer.
Only a valid candidate reaches the single atomic `structure.reconcile` transaction. Rejections keep
the last-known-good authored document, runtime graph, and DOM.

Export the current authored prototype without coupling the browser to an AI provider:

```ts
import { exportUnifoldApplication } from "@unislang/unifold-export";

const exported = await exportUnifoldApplication(result.application);
```

Natural-language edits are proposed through the server-oriented `@unislang/unifold-ai` package and
must pass its revision/hash, patch-policy, approval, and compiler gates before the same application
update path is used. See [AI proposals and prototype export](./ai-and-export.md).

## Browser verification

Install pinned Playwright browsers once and execute the supported matrix:

```sh
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm exec playwright test --config tests/e2e/playwright.config.ts
```

The E2E configuration builds and serves the reference application automatically. Set `PLAYWRIGHT_BASE_URL` to verify an already-running preview or exported application.

## Current vertical slice

Phase 0 deliberately proves the narrow end-to-end seam first: an authored JSON document expands reusable compositions, compiles to normalized IR, renders accessible Web Components, emits canonical events, updates normalized state atomically, reconciles revised JSON, and selectively refreshes only subscribed nodes. The initial composition contract and twenty-six-component catalog are not presented as the complete framework vocabulary.
